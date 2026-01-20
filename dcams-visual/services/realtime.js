(function (window) {
  'use strict';

  var DCAMS = (window.DCAMS = window.DCAMS || {});
  DCAMS.services = DCAMS.services || {};

  var timer = null;

  function indexById(items, key) {
    return items.reduce(function (acc, item) {
      acc[item[key]] = item;
      return acc;
    }, {});
  }

  function diffCollection(prevItems, nextItems, key) {
    var changedIds = [];
    var prevIndex = indexById(prevItems, key);
    var nextIndex = indexById(nextItems, key);
    Object.keys(nextIndex).forEach(function (id) {
      if (!prevIndex[id] || JSON.stringify(prevIndex[id]) !== JSON.stringify(nextIndex[id])) {
        changedIds.push(id);
      }
    });
    return changedIds;
  }

  function diffData(prev, next) {
    if (!prev) {
      return {
        data: next,
        changes: { racks: [], assets: [], connections: [], ups: [], batteries: [] },
        changed: true
      };
    }

    var changes = {
      racks: diffCollection(prev.racks, next.racks, 'RackId'),
      assets: diffCollection(prev.assets, next.assets, 'AssetId'),
      connections: diffCollection(prev.connections, next.connections, 'ConnectionId'),
      ups: diffCollection(prev.ups, next.ups, 'UpsId'),
      batteries: diffCollection(prev.batteries, next.batteries, 'BatteryId')
    };

    var changed =
      changes.racks.length ||
      changes.assets.length ||
      changes.connections.length ||
      changes.ups.length ||
      changes.batteries.length;

    return { data: next, changes: changes, changed: Boolean(changed) };
  }

  function startPolling(fetcher, currentData, onUpdate, onError) {
    if (timer) {
      clearInterval(timer);
    }
    timer = setInterval(function () {
      fetcher()
        .then(function (data) {
          var updated = diffData(currentData, data);
          if (updated.changed) {
            currentData = updated.data;
            onUpdate(updated.data, updated.changes);
          }
        })
        .catch(function () {
          if (onError) {
            onError();
          }
        });
    }, DCAMS.config.POLL_INTERVAL_MS || 12000);
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  DCAMS.services.realtime = {
    startPolling: startPolling,
    stopPolling: stopPolling
  };
})(window);
