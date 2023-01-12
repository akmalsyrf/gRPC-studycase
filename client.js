const grpc = require("@grpc/grpc-js");
var protoLoader = require("@grpc/proto-loader");
const PROTO_PATH = "./news.proto";

const options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};
 

  const maxRetries = 5;
  const interceptor = (options, nextCall) => {
    var savedMetadata;
    var savedSendMessage;
    var savedReceiveMessage;
    var savedMessageNext;
    var requester = {
        start: function(metadata, listener, next) {
            savedMetadata = metadata;
            var newListener = {
                onReceiveMessage: function(message, next) {
                    savedReceiveMessage = message;
                    savedMessageNext = next;
                },
                onReceiveStatus: function(status, next) {
                    var retries = 0;
                    var retry = function(message, metadata) {
                        console.log('retries ', retries)
                        retries++;
                        var newCall = nextCall(options);
                        newCall.start(metadata, {
                            onReceiveMessage: function(message) {
                                savedReceiveMessage = message;
                            },
                            onReceiveStatus: function(status) {
                                if (status.code !== grpc.status.OK) {
                                    if (retries <= maxRetries) {
                                        retry(message, metadata);
                                    } else {
                                        savedMessageNext(savedReceiveMessage);
                                        next(status);
                                    }
                                } else {
                                    savedMessageNext(savedReceiveMessage);
                                    next({code: grpc.status.OK});
                                }
                            }
                        })
                    };
                    if (status.code !== grpc.status.OK) {
                        retry(savedSendMessage, savedMetadata);
                    } else {
                        savedMessageNext(savedReceiveMessage);
                        next(status);
                    }
                }
            };
            next(metadata, newListener);
        },
        sendMessage: function(message, next) {
            savedSendMessage = message;
            next(message);
        }
    };
    return new grpc.InterceptingCall(nextCall(options), requester);

  }

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