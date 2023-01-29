const grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");
const PROTO_PATH = "./news.proto";
const interceptor = require('./interceptor')

console.log('success import interceptor ', interceptor)

const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
 
const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);

const NewsService = grpc.loadPackageDefinition(packageDefinition).NewsService;

const client = new NewsService(
  "127.0.0.1:50051",
  grpc.credentials.createInsecure(),
  {
    interceptors : [interceptor]
  }
)

module.exports = client