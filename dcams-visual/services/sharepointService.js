(function (window) {
  'use strict';

  var DCAMS = (window.DCAMS = window.DCAMS || {});
  DCAMS.services = DCAMS.services || {};

  var listTitles = function () {
    return DCAMS.config && DCAMS.config.LIST_TITLES
      ? DCAMS.config.LIST_TITLES
      : {};
  };

  function getRequestDigest() {
    return fetch('/_api/contextinfo', {
      method: 'POST',
      headers: {
        Accept: 'application/json;odata=verbose'
      }
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        return data.d.GetContextWebInformation.FormDigestValue;
      });
  }

  function getListItems(listTitle, select, expand) {
    var url =
      "/_api/web/lists/getbytitle('" +
      listTitle +
      "')/items?$select=" +
      select +
      '&$top=5000';
    if (expand) {
      url += '&$expand=' + expand;
    }
    return fetch(url, {
      headers: {
        Accept: 'application/json;odata=verbose'
      }
    })
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        return data.d.results;
      });
  }

  function createListItem(listTitle, payload) {
    return getRequestDigest().then(function (digest) {
      return fetch("/_api/web/lists/getbytitle('" + listTitle + "')/items", {
        method: 'POST',
        headers: {
          Accept: 'application/json;odata=verbose',
          'Content-Type': 'application/json;odata=verbose',
          'X-RequestDigest': digest
        },
        body: JSON.stringify(payload)
      }).then(function (response) {
        if (!response.ok) {
          throw new Error('Failed to create item');
        }
        return response.json();
      });
    });
  }

  function mapRacks(items) {
    return items.map(function (item) {
      return {
        RackId: item.Title,
        LocationX: item.LocationX || 0,
        LocationY: item.LocationY || 0,
        TotalSlots: item.TotalSlots || 42,
        PowerCapacity: item.PowerCapacity || 0,
        PhysicalCapacity: item.PhysicalCapacity || 0,
        Notes: item.Notes || ''
      };
    });
  }

  function mapAssets(items) {
    return items.map(function (item) {
      return {
        AssetId: item.Title,
        RackId: item.RackId || '',
        SlotFrom: item.SlotFrom || 1,
        SlotTo: item.SlotTo || 1,
        DeviceType: item.DeviceType || '',
        Brand: item.Brand || '',
        Model: item.Model || '',
        Serial: item.Serial || '',
        PowerLoadKW: item.PowerLoadKW || 0,
        PhysicalLoadKG: item.PhysicalLoadKG || 0,
        Consumption: item.Consumption || '',
        Status: item.Status || 'Healthy',
        UpdatedAt: item.UpdatedAt || ''
      };
    });
  }

  function mapConnections(items) {
    return items.map(function (item) {
      var points = [];
      if (item.PathPoints) {
        try {
          points = JSON.parse(item.PathPoints);
        } catch (error) {
          points = [];
        }
      }
      return {
        ConnectionId: item.Title,
        FromAssetId: item.FromAssetId || '',
        ToEndpointLabel: item.ToEndpointLabel || '',
        CableType: item.CableType || '',
        PortFrom: item.PortFrom || '',
        PortTo: item.PortTo || '',
        PathPoints: points,
        Notes: item.Notes || '',
        Status: item.Status || 'Healthy'
      };
    });
  }

  function mapUps(items) {
    return items.map(function (item) {
      return {
        UpsId: item.Title,
        LocationX: item.LocationX || 0,
        LocationY: item.LocationY || 0,
        CapacityKVA: item.CapacityKVA || 0,
        Status: item.Status || 'Healthy',
        LastUpdated: item.LastUpdated || '',
        Notes: item.Notes || ''
      };
    });
  }

  function mapBatteries(items) {
    return items.map(function (item) {
      return {
        BatteryId: item.Title,
        UpsId: item.UpsId || '',
        CapacityPct: item.CapacityPct || 0,
        Health: item.Health || 'Healthy',
        InspectorComment: item.InspectorComment || '',
        UpdatedBy: item.UpdatedBy || '',
        UpdatedAt: item.UpdatedAt || ''
      };
    });
  }

  function getAllData() {
    var titles = listTitles();
    return Promise.all([
      getListItems(titles.racks, 'Title,LocationX,LocationY,TotalSlots,PowerCapacity,PhysicalCapacity,Notes'),
      getListItems(
        titles.assets,
        'Title,RackId,SlotFrom,SlotTo,DeviceType,Brand,Model,Serial,PowerLoadKW,PhysicalLoadKG,Consumption,Status,UpdatedAt'
      ),
      getListItems(
        titles.connections,
        'Title,FromAssetId,ToEndpointLabel,CableType,PortFrom,PortTo,PathPoints,Notes,Status'
      ),
      getListItems(titles.ups, 'Title,LocationX,LocationY,CapacityKVA,Status,LastUpdated,Notes'),
      getListItems(
        titles.batteries,
        'Title,UpsId,CapacityPct,Health,InspectorComment,UpdatedBy,UpdatedAt'
      )
    ]).then(function (results) {
      return {
        racks: mapRacks(results[0]),
        assets: mapAssets(results[1]),
        connections: mapConnections(results[2]),
        ups: mapUps(results[3]),
        batteries: mapBatteries(results[4])
      };
    });
  }

  function createBatteryEntry(payload) {
    var titles = listTitles();
    return createListItem(titles.batteries, payload);
  }

  DCAMS.services.sharepointService = {
    getRequestDigest: getRequestDigest,
    getListItems: getListItems,
    getAllData: getAllData,
    createBatteryEntry: createBatteryEntry
  };
})(window);
