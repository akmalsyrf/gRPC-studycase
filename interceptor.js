const maxRetries = 5;
const delayer = 3000;
const {
  StatusBuilder,
  ListenerBuilder,
  InterceptingCall,
  RequesterBuilder,
  status: Statuses,
  loadPackageDefinition,
  credentials
} = require('@grpc/grpc-js');
const _ = require('lodash');
const protoLoader = require('@grpc/proto-loader');

const CallRegistry = function(done, expectation, is_ordered, is_verbose) {
  this.call_map = {};
  this.call_array = [];
  this.done = done;
  this.expectation = expectation;
  this.expectation_is_array = Array.isArray(this.expectation);
  this.is_ordered = is_ordered;
  this.is_verbose = is_verbose;
  if (is_verbose) {
    console.log('Expectation: ', expectation);
  }
};

CallRegistry.prototype.addCall = function(call_name) {
  if (this.expectation_is_array) {
    this.call_array.push(call_name);
    if (this.is_verbose) {
      console.log(this.call_array);
    }
  } else {
    if (!this.call_map[call_name]) {
      this.call_map[call_name] = 0;
    }
    this.call_map[call_name]++;
    if (this.is_verbose) {
      console.log(this.call_map);
    }
  }
  this.maybeCallDone();
};

CallRegistry.prototype.maybeCallDone = function() {
  if (this.expectation_is_array) {
    if (this.is_ordered) {
      if (this.expectation && _.isEqual(this.expectation, this.call_array)) {
        this.done();
      }
    } else {
      var intersection = _.intersectionWith(this.expectation, this.call_array,
        _.isEqual);
      if (intersection.length === this.expectation.length) {
        this.done();
      }
    }
  } else if (this.expectation && _.isEqual(this.expectation, this.call_map)) {
    this.done();
  }
};

const Registry = new CallRegistry(function() {
  console.log('done done cuy')
}, [
  'retry_foo_1', 'retry_foo_2', 'retry_foo_3',
  'foo_result', 'retry_bar_1', 'bar_result'
]);

module.exports = function(options, nextCall) {
  var savedMetadata;
  var savedSendMessage;
  var savedReceiveMessage;
  var savedMessageNext;
  var requester = (new RequesterBuilder())
    .withStart(function(metadata, listener, next) {
      savedMetadata = metadata;
      var new_listener = (new ListenerBuilder())
        .withOnReceiveMessage(function(message, next) {
          savedReceiveMessage = message;
          savedMessageNext = next;
        })
        .withOnReceiveStatus(function(status, next) {
            var retries = 0;
            var retry = function(message, metadata) {
              retries++;
              var newCall = nextCall(options);
              var receivedMessage;
              newCall.start(metadata, {
                onReceiveMessage: function(message) {
                  receivedMessage = message;
                },
                onReceiveStatus: async function(status) {
                  await Promise.delay(delayer);

                  console.log(`Retries: ${retries}`);
                  Registry.addCall('retry_' + savedMetadata.get('name') + '_' + retries);
                  if (status.code !== Statuses.OK) {
                    if (retries <= maxRetries) {
                      retry(message, metadata);
                    } else {
                      savedMessageNext(receivedMessage);
                      next(status);
                    }
                  } else {
                    Registry.addCall('success_call');
                    var new_status = (new StatusBuilder())
                      .withCode(Statuses.OK).build();
                    savedMessageNext(receivedMessage);
                    next(new_status);
                  }
                }
              });
              newCall.sendMessage(message);
              newCall.halfClose();
            };
            if (status.code !== Statuses.OK) {
              // Change the message we're sending only for test purposes
              // so the server will respond without error
              var newMessage = (savedMetadata.get('name')[0] === 'bar') ?
                {value: 'bar'} : savedSendMessage;
              retry(newMessage, savedMetadata);
            } else {
              savedMessageNext(savedReceiveMessage);
              next(status);
            }
          }
        ).build();
      next(metadata, new_listener);
    })
    .withSendMessage(function(message, next) {
      savedSendMessage = message;
      next(message);
    }).build();
  return new InterceptingCall(nextCall(options), requester);
};