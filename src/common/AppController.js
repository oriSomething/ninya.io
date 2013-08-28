angular.module('StackWho')

  .controller('AppController', ['$scope', '$http', '$rootScope', 'chunkFetcher', function($scope, $http, $rootScope, chunkFetcher) {
    
    'use strict';

    $scope.searchString = '';
    $scope.searchStringTags = '';
    $scope.displayUsers = [];
    
    var locationRegex, tagsRegex;
    
    
    //let's improve this: We can't intercept and fetch all tags for all users.
    //Too many requests, too much data.
    //What we should do is to provide a "Fetch tag data for visible users"-feature
    //which then only fetches the tags for a subset of the users.
    //We can store the information directly on the user and then also check
    //if we also have that information so that we don't load it again if we
    //have it already. We should also make it visible directly from the list
    //if we already have tag information for a user or not. 
    
    var augmentUsersWithTagInterceptor = function(users){
      var ids = _.reduce(users, function(acc, current){
          var delimiter = acc.length === 0 ? '' : ';';
          return acc + delimiter + current.user_id;
      }, '');
      
      console.log(ids);
      
      var fetcher = chunkFetcher('http://api.stackoverflow.com/1.1/users/' + ids +'/tags?', 'tags', 100);
      
      return fetcher
              .fetch()
              .then(function(tags){
                console.log(tags);
                return users;
              });
    };

    var fetcher = chunkFetcher('http://api.stackoverflow.com/1.1/users?', 'users', 100 /*, augmentUsersWithTagInterceptor*/);

    $scope.fetcher = fetcher;
    
    $rootScope.$on('fetchedData', function(){
      updateList();
    });
        
    $scope.rebuildIndex = function(){
      fetcher.reset();
      fetcher.fetch();
    };
    
    $scope.continueIndexBuild = function(){
      fetcher.resume();
    };
    
    var filter = function(users){
      return users.filter(function(user){
        return locationRegex.test(user.location); 
      });
    };

    var filterByTags = function(users){
      return users.filter(function(user){
        return user.top_tags && _.any(user.top_tags, function(tag){
          return tagsRegex.test(tag.tag_name);
        });
      });
    };
    
    var updateList = function(){
      $scope.displayUsers = [];
      $scope.displayUsers = filter(fetcher.data);

      if ($scope.searchStringTags.length >0){
        $scope.displayUsers = filterByTags($scope.displayUsers);
      }

    };
  
    $scope.$watch('searchString', function(term){
      locationRegex = new RegExp(term, 'i');
      updateList();
    });

    $scope.$watch('searchStringTags', function(term){
      tagsRegex = new RegExp(term, 'i');
      updateList();
    });

    $scope.toggleSelection = function(){
      if ($scope.displayUsers.length === 0){
        return;
      }

      var checkState = !!!$scope.displayUsers[0].fetchTags;

      $scope.displayUsers.forEach(function(user){
        user.fetchTags = checkState;
      });

    };

    $scope.fetchTags = function(){
      $scope.displayUsers.forEach(function(user){
        if (user.fetchTags && !user.top_tags){
          //there is no paging involved for this API hence the simple $http call
          $http({method: 'jsonp', url: 'http://api.stackoverflow.com/1.1/users/' + user.user_id + '/top-answer-tags?&jsonp=JSON_CALLBACK'})
            .success(function(data){
              user.top_tags = data.top_tags;
            });
        }
      });
    };

  }]);
  
  
  

