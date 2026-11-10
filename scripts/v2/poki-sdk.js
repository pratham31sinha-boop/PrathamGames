// PRATHAM GAMES — Instant High-Speed Poki Bridge
(function() {
  'use strict';
  if (!window.PokiSDK) {
    var resolvedPromise = function(val) { return Promise.resolve(val); };
    var noop = function() {};
    window.PokiSDK = {
      init: function() { return resolvedPromise(); },
      commercialBreak: function(fn) { if (typeof fn === 'function') fn(); return resolvedPromise(); },
      rewardedBreak: function(fn) { if (typeof fn === 'function') fn(true); return resolvedPromise(true); },
      displayAd: function(e, t, o, i) { if (typeof i === 'function') i(true); if (typeof o === 'function') o(); return resolvedPromise(); },
      destroyAd: noop,
      getLeaderboard: function() { return resolvedPromise([]); },
      shareableURL: function() { return resolvedPromise(window.location.href); },
      getURLParam: function() { return ''; },
      getLanguage: function() { return (navigator.language || 'en').split('-')[0]; },
      getDeviceInfo: function() { return { category: 'desktop' }; },
      isAdBlocked: function() { return false; },
      getUser: function() { return resolvedPromise({ id: 'pratham_user', name: 'Gamer' }); },
      getToken: function() { return resolvedPromise('pratham_token'); },
      login: function() { return resolvedPromise({ id: 'pratham_user' }); },
      gameLoadingStart: noop,
      gameLoadingProgress: noop,
      gameLoadingFinished: noop,
      gameplayStart: noop,
      gameplayStop: noop,
      happyTime: noop,
      setDebug: noop,
      setLogging: noop
    };
  }
  window.pokiReady = true;
  if (window.pokiBridge && window.unityGame) {
    try { window.unityGame.SendMessage(window.pokiBridge, "ready"); } catch(e) {}
  }
})();
