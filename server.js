const grpc = require("@grpc/grpc-js");
const PROTO_PATH = "./news.proto";
var protoLoader = require("@grpc/proto-loader");
const newsData = require("./mock-data")

const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const newsProto = grpc.loadPackageDefinition(packageDefinition);

const server = new grpc.Server();

server.addService(newsProto.NewsService.service, {
  getAllNews: (_, callback) => {
    callback(null, newsData);
  },
  getNews: (_, callback) => {
    const newsId = _.request.id;
    let {news} = newsData
    const newsItem = news.find(({ id }) => newsId == id);
    callback(null, newsItem);
  },
  deleteNews: (_, callback) => {
    const newsId = _.request.id;
    let {news} = newsData
    news = news.filter(({ id }) => id !== newsId);
    callback(null, {news});
  },
  editNews: (_, callback) => {
    const newsId = _.request.id;
    let {news} = newsData
    const newsItem = news.find(({ id }) => newsId == id);
    newsItem.body = _.request.body;
    newsItem.postImage = _.request.postImage;
    newsItem.title = _.request.title;
    callback(null, newsItem);
  },
  addNews: (call, callback) => {
    let _news = { id: Date.now(), ...call.request };
    let {news} = newsData
    news.push(_news);
    callback(null, _news);
  },
});

server.bindAsync(
  "127.0.0.1:50051",
  grpc.ServerCredentials.createInsecure(),
  (error, port) => {
    console.log("Server run at port:", port);
    server.start();
  }
);