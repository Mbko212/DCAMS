(function (window) {
  'use strict';

  var DCAMS = (window.DCAMS = window.DCAMS || {});
  DCAMS.services = DCAMS.services || {};

  var CACHE_KEY = 'dcams-rbac';

  function fetchCurrentUser() {
    return fetch('/_api/web/currentuser?$select=Id,Title,LoginName', {
      headers: {
        Accept: 'application/json;odata=verbose'
      }
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        return data.d;
      });
  }

  function fetchGroups() {
    return fetch('/_api/web/currentuser/groups?$select=Title', {
      headers: {
        Accept: 'application/json;odata=verbose'
      }
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        return data.d.results.map(function (group) {
          return group.Title;
        });
      });
  }

  function resolveRole(groups) {
    if (groups.indexOf('DCAMS Inspectors') !== -1) {
      return 'inspector';
    }
    if (groups.indexOf('DCAMS Supervisors') !== -1) {
      return 'supervisor';
    }
    if (groups.indexOf('DCAMS Viewers') !== -1) {
      return 'viewer';
    }
    return 'none';
  }

  function getCachedRole() {
    try {
      var cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  function setCachedRole(data) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
      return null;
    }
    return null;
  }

  function getCurrentRole() {
    var cached = getCachedRole();
    if (cached) {
      return Promise.resolve(cached);
    }
    return Promise.all([fetchCurrentUser(), fetchGroups()])
      .then(function (result) {
        var user = result[0];
        var groups = result[1];
        var role = resolveRole(groups);
        var info = {
          role: role,
          user: user,
          groups: groups
        };
        setCachedRole(info);
        return info;
      })
      .catch(function () {
        return { role: 'none' };
      });
  }

  DCAMS.services.rbac = {
    getCurrentRole: getCurrentRole
  };
})(window);
