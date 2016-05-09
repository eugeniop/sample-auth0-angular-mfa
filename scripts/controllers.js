var myApp = angular.module('myApp');

myApp.controller('MenuCtrl', function ($scope, $location) {
  $scope.go = function (target) {
    $location.path(target);
  };
});

myApp.controller('MsgCtrl', function ($scope, auth) {
  $scope.message = {text: ''};
});

myApp.controller('RootCtrl', function (auth, $scope) {
  $scope.auth = auth;
  $scope.$watch('auth.profile.name', function(name) {
    if (!name) {
      return;
    }
    $scope.message.text = 'Welcome ' + auth.profile.name + '!';
  });
});

myApp.controller('LoginCtrl', function (auth, $scope, $location, store) {
  $scope.user = '';
  $scope.pass = '';

  function onLoginSuccess(profile, token, accessToken, state, refreshToken) {
    $scope.message.text = '';
    store.set('profile', profile);
    store.set('token', token);
    if(!profile.requires_mfa){
      //No MFA is required. Just go to the app
      $location.path('/');
    } else {
      //MFA is required, we start a passwrodless transaction:
      //This is a method in auth0.js not exposed yet in Auth0Angular
      //so routing through the internal object:
      auth.config.auth0lib.startPasswordless({
                        phoneNumber: profile.phone,
                    }, function (err, result) {
                        $scope.$apply(function() {
                          if(err){ return console.log(err); }
                          $location.path('/mfa');
                        });
                    });
    }
    $scope.loading = false;
  }

  function onLoginSMSSuccess(profile, smsToken, accessToken, state, refreshToken) {
    $scope.message.text = '';
    
    // One SMS is confirmed, we renew the original token
    // a server side rule (that runs on the SMS pipeline) clears 
    // the MFA flag
    auth.getToken({
        id_token: store.get('token'),
        targetClientId: 'XdiZ1pwS4pX3mo2VhbypBp65kDiAgXjn',
        api: 'auth0'
        }).then(function(token){
          store.set('token', token.id_token);
          $location.path('/');
          $scope.loading = false;
        });
  }

  function onLoginSMSFailed(err) {
    $scope.message.text = 'Error in MFA ' + err;
    $scope.loading = false;
  }

  function onLoginFailed(err) {
    $scope.message.text = 'invalid credentials: ' + err;
    $scope.loading = false;
  }

  $scope.submit = function () {
    $scope.message.text = 'loading...';
    $scope.loading = true;

    auth.signin({
      connection: 'Username-Password-Authentication',
      username: $scope.user,
      password: $scope.pass,
      scope: 'openid name email',
      sso: false
    }, onLoginSuccess, onLoginFailed);
  };

  $scope.submitCode = function() {
    auth.signin({
      connection: 'sms',
      username: store.get('profile').phone,
      password: $scope.code,
      scope: 'openid',
      sso: false
    }, onLoginSMSSuccess, onLoginSMSFailed);
  };

  $scope.doGoogleAuthWithPopup = function () {
    $scope.message.text = 'loading...';
    $scope.loading = true;

    auth.signin({
      popup: true,
      connection: 'google-oauth2',
      scope: 'openid name email'
    }, onLoginSuccess, onLoginFailed);
  };

});

myApp.controller('LogoutCtrl', function (auth, $scope, $location, store) {
  auth.signout();
  $scope.$parent.message = '';
  store.remove('profile');
  store.remove('token');
  $location.path('/login');
});
