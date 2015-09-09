angular.module('starter.controllers', [])
  .directive('opentokSession', function() {
    return {
      restrict: 'E',
      scope: {
        apiKey: '&',
        sessionId: '&',
        token: '&',
        streams: '='
      },
      controller: function($scope) {
        $scope.connected = false;
        $scope.streams = [];
        $scope.$watch(function() {
          return !!$scope.apiKey() && !!$scope.sessionId() && !!$scope.token();
        }, function(canConnect) {
          if (!canConnect) {
            return;
          }
          $scope.session = OT.initSession($scope.apiKey(), $scope.sessionId());
          $scope.session.on('streamCreated', function(event) {
            $scope.$apply(function() {
              $scope.streams.push(event.stream);
            });

            $scope.$broadcast('streamAdded', event.stream);
          });

          $scope.session.on('streamDestroyed', function(event) {
            $scope.$apply(function() {
              $scope.streams.splice($scope.streams.indexOf(event.stream), 1);
            });
          });

          $scope.session.connect($scope.token(), function() {
            $scope.connected = true;
            $scope.$broadcast('connected');
          });
      });

        this.getApiKey = function() {
          return $scope.apiKey();
        };

        this.publish = function(publisher, callback) {
          $scope.session.publish(publisher, callback);
        };

        this.subscribe = function(stream, element, props, callback) {
          $scope.session.subscribe(stream, element, props, callback);
        };

        this.getStreams = function() {
          return $scope.streams;
        };

        this.isConnected = function() {
          return $scope.connected;
        };
      }
    };
  })
  .directive('opentokSubscriber', function() {
    return {
      restrict: 'E',
      require: ['^opentokSession'],
      scope: {
        stream: '&',
        width: '@',
        height: '@',
        audioVolume: '@',
        showControls: '@'
      },
      template: '<div class="subscriber"></div>',
      link: function(scope, element, attrs, controllers) {
        var opentokSession = controllers[0];
        scope.$watch(function() {
          return scope.stream();
        }, function(stream) {
          console.log(scope, 'the scope');
          opentokSession.subscribe(
            stream,
            element[0].childNodes[0],
            {
              height: scope.height,
              width: scope.width,
              audioVolume: scope.audioVolume,
              showControls: scope.showControls !== 'false' && scope.showControls
            },
            function(err) {
              if (err) {
                alert(err);
              }
            }
          );
        });
      }
    };
  })
  .directive('opentokPublisher', function() {
    return {
      restrict: 'E',
      require: ['^opentokSession'],
      scope: {
        width: '@',
        height: '@'
      },
      template: '<div class="publisher"></div>',
      link: function(scope, element, attrs, controllers) {
        var opentokSession = controllers[0];
        scope.$watch(
          function() {
            return !!opentokSession.getApiKey() && !scope.publisher;
          },
          function(readyToInit) {
            if (!readyToInit) {
              return;
            }
            scope.publisher = OT.initPublisher(opentokSession.getApiKey(), element[0].childNodes[0], {
              height: scope.height,
              width: scope.width
            }, function(err) {
              if (err) {
                alert('error occurred');
                alert(err.message);
              }
            });
          }
        );
        scope.$watch(opentokSession.isConnected, function(connected) {
          if (connected) {
            opentokSession.publish(scope.publisher, function(err) {
              if (err) {
                alert('error publishing');
              }
            });
          }
        });
      }
    }
  })

.controller('MeetCtrl', function($scope, $ionicPopup, $http, $ionicSlideBoxDelegate) {
  var meetController = this;
  this.hasInput = false;

  this.selectVideo = function(key) {
    $ionicSlideBoxDelegate.slide(key);
  };

  $scope.$watchCollection(function() {
    return meetController.streams;
  }, function() {
    $ionicSlideBoxDelegate.update();
  });

  meetController.connect = function() {
    if (!meetController.room) {
      $ionicPopup.alert({
        title: 'No room',
        template: 'Please enter a room name to join'
      });
      return;
    }
    this.hasInput = true;
    $http.get('https://meet.tokbox.com/' + meetController.room, {
      headers: {
        Accept: 'application/json'
      }
    }).then(function(result) {
      meetController.apiKey = result.data.apiKey;
      meetController.token = result.data.token;
      meetController.sessionId = result.data.sessionId;
    });
  };
})

.controller('ChatsCtrl', function($scope, Chats) {
  // With the new view caching in Ionic, Controllers are only called
  // when they are recreated or on app start, instead of every page change.
  // To listen for when this page is active (for example, to refresh data),
  // listen for the $ionicView.enter event:
  //
  //$scope.$on('$ionicView.enter', function(e) {
  //});

  $scope.chats = Chats.all();
  $scope.remove = function(chat) {
    Chats.remove(chat);
  };
})

.controller('ChatDetailCtrl', function($scope, $stateParams, Chats) {
  $scope.chat = Chats.get($stateParams.chatId);
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
