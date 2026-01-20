(function () {
  'use strict';

  (function ensurePolyfills() {
    if (typeof Promise === 'undefined') {
      var PromisePoly = function (executor) {
        var state = 'pending';
        var value = null;
        var handlers = [];

        function resolve(result) {
          if (state !== 'pending') {
            return;
          }
          if (result && typeof result.then === 'function') {
            result.then(resolve, reject);
            return;
          }
          state = 'fulfilled';
          value = result;
          handlers.forEach(handle);
          handlers = null;
        }

        function reject(error) {
          if (state !== 'pending') {
            return;
          }
          state = 'rejected';
          value = error;
          handlers.forEach(handle);
          handlers = null;
        }

        function handle(handler) {
          if (state === 'pending') {
            handlers.push(handler);
            return;
          }
          var cb = state === 'fulfilled' ? handler.onFulfilled : handler.onRejected;
          if (!cb) {
            (state === 'fulfilled' ? handler.resolve : handler.reject)(value);
            return;
          }
          try {
            handler.resolve(cb(value));
          } catch (error) {
            handler.reject(error);
          }
        }

        this.then = function (onFulfilled, onRejected) {
          return new PromisePoly(function (resolveNext, rejectNext) {
            handle({
              onFulfilled: onFulfilled,
              onRejected: onRejected,
              resolve: resolveNext,
              reject: rejectNext
            });
          });
        };

        this.catch = function (onRejected) {
          return this.then(null, onRejected);
        };

        try {
          executor(resolve, reject);
        } catch (error) {
          reject(error);
        }
      };

      PromisePoly.resolve = function (value) {
        return new PromisePoly(function (resolve) {
          resolve(value);
        });
      };

      PromisePoly.reject = function (reason) {
        return new PromisePoly(function (_, reject) {
          reject(reason);
        });
      };

      PromisePoly.all = function (promises) {
        return new PromisePoly(function (resolve, reject) {
          var results = [];
          var remaining = promises.length;
          if (!remaining) {
            resolve(results);
            return;
          }
          promises.forEach(function (promise, index) {
            PromisePoly.resolve(promise).then(
              function (value) {
                results[index] = value;
                remaining -= 1;
                if (!remaining) {
                  resolve(results);
                }
              },
              function (error) {
                reject(error);
              }
            );
          });
        });
      };

      window.Promise = PromisePoly;
    }

    if (typeof window.fetch === 'undefined') {
      window.fetch = function (url, options) {
        return new Promise(function (resolve, reject) {
          var xhr = new XMLHttpRequest();
          var method = (options && options.method) || 'GET';
          xhr.open(method, url, true);
          if (options && options.headers) {
            Object.keys(options.headers).forEach(function (key) {
              xhr.setRequestHeader(key, options.headers[key]);
            });
          }
          xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) {
              return;
            }
            var response = {
              ok: xhr.status >= 200 && xhr.status < 300,
              status: xhr.status,
              text: function () {
                return Promise.resolve(xhr.responseText);
              },
              json: function () {
                try {
                  return Promise.resolve(JSON.parse(xhr.responseText));
                } catch (error) {
                  return Promise.reject(error);
                }
              }
            };
            resolve(response);
          };
          xhr.onerror = function () {
            reject(new Error('Network request failed'));
          };
          xhr.send(options && options.body ? options.body : null);
        });
      };
    }
  })();

  var root = document.getElementById('dcams-root');
  if (!root) {
    return;
  }

  var basePath = (function () {
    var script = document.currentScript;
    if (!script) {
      var scripts = document.getElementsByTagName('script');
      script = scripts[scripts.length - 1];
    }
    if (!script || !script.src) {
      return './';
    }
    return script.src.replace(/app\.js(\?.*)?$/, '');
  })();

  var DCAMS = (window.DCAMS = window.DCAMS || {});
  DCAMS.basePath = basePath;
  DCAMS.config = {
    DATA_SOURCE: 'json',
    POLL_INTERVAL_MS: 12000,
    LIST_TITLES: {
      racks: 'DCAMS_Racks',
      assets: 'DCAMS_Assets',
      connections: 'DCAMS_Connections',
      ups: 'DCAMS_UPS',
      batteries: 'DCAMS_UPS_Batteries',
      audit: 'DCAMS_AuditLog'
    }
  };

  var i18n = {
    en: {
      title: 'DCAMS – Visual Maps',
      search: 'Search',
      rackId: 'Rack ID',
      occupancy: 'Occupancy',
      brand: 'Brand',
      alert: 'Alert',
      threshold: 'Threshold',
      dataCenterMap: 'Data Center Map',
      upsMap: 'UPS Map',
      details: 'Details',
      rackOverview: 'Rack Overview',
      slotGrid: 'Slot Grid',
      deviceDetails: 'Device Details',
      upsDetails: 'UPS Details',
      status: 'Status',
      capacity: 'Capacity',
      lastUpdated: 'Last Updated',
      update: 'Update',
      noSelection: 'Select a rack or UPS to view details.',
      unauthorized: "You don't have access to view this module.",
      all: 'All',
      occupied: 'Occupied',
      empty: 'Empty',
      healthy: 'Healthy',
      warning: 'Warning',
      critical: 'Critical',
      inspectorOnly: 'Inspector only',
      language: 'Language',
      apply: 'Apply',
      cancel: 'Cancel',
      inspectorUpdate: 'Inspector Update'
    },
    ar: {
      title: 'ديكامز – الخرائط المرئية',
      search: 'بحث',
      rackId: 'رقم الراك',
      occupancy: 'الإشغال',
      brand: 'العلامة',
      alert: 'التنبيه',
      threshold: 'الحدود',
      dataCenterMap: 'خريطة مركز البيانات',
      upsMap: 'خريطة UPS',
      details: 'التفاصيل',
      rackOverview: 'نظرة عامة على الراك',
      slotGrid: 'شبكة الخانات',
      deviceDetails: 'تفاصيل الجهاز',
      upsDetails: 'تفاصيل UPS',
      status: 'الحالة',
      capacity: 'السعة',
      lastUpdated: 'آخر تحديث',
      update: 'تحديث',
      noSelection: 'اختر راك أو UPS لعرض التفاصيل.',
      unauthorized: 'لا تملك صلاحية الوصول إلى هذه الوحدة.',
      all: 'الكل',
      occupied: 'مشغول',
      empty: 'فارغ',
      healthy: 'سليم',
      warning: 'تحذير',
      critical: 'حرج',
      inspectorOnly: 'للمفتش فقط',
      language: 'اللغة',
      apply: 'تطبيق',
      cancel: 'إلغاء',
      inspectorUpdate: 'تحديث المفتش'
    }
  };

  var state = {
    language: 'en',
    activeTab: 'dc',
    data: null,
    selectedRackId: null,
    selectedUpsId: null,
    role: 'viewer',
    filters: {
      search: '',
      occupancy: 'all',
      brand: 'all',
      alert: 'all'
    }
  };

  function loadScriptsSequential(urls, callback) {
    var index = 0;
    function next() {
      if (index >= urls.length) {
        callback();
        return;
      }
      var script = document.createElement('script');
      script.src = basePath + urls[index];
      script.onload = function () {
        index += 1;
        next();
      };
      script.onerror = function () {
        index += 1;
        next();
      };
      document.head.appendChild(script);
    }
    next();
  }

  function t(key) {
    return i18n[state.language][key] || key;
  }

  function formatDate(value) {
    if (!value) {
      return '-';
    }
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString(state.language === 'ar' ? 'ar' : 'en', {
      hour12: false
    });
  }

  function renderShell() {
    root.innerHTML = '';

    var shell = document.createElement('div');
    shell.className = 'dcams-shell';
    shell.setAttribute('role', 'application');

    var topbar = document.createElement('div');
    topbar.className = 'dcams-topbar';
    topbar.innerHTML =
      '<h1>' +
      t('title') +
      '</h1>' +
      '<div class="dcams-tabs" role="tablist">' +
      '<button type="button" class="dcams-tab" data-tab="dc">' +
      t('dataCenterMap') +
      '</button>' +
      '<button type="button" class="dcams-tab" data-tab="ups">' +
      t('upsMap') +
      '</button>' +
      '</div>' +
      '<div class="dcams-controls">' +
      '<input type="search" id="dcams-search" placeholder="' +
      t('search') +
      '" aria-label="' +
      t('search') +
      '" />' +
      '<select id="dcams-occupancy" aria-label="' +
      t('occupancy') +
      '">' +
      '<option value="all">' +
      t('all') +
      '</option>' +
      '<option value="occupied">' +
      t('occupied') +
      '</option>' +
      '<option value="empty">' +
      t('empty') +
      '</option>' +
      '</select>' +
      '<select id="dcams-brand" aria-label="' +
      t('brand') +
      '">' +
      '<option value="all">' +
      t('all') +
      '</option>' +
      '</select>' +
      '<select id="dcams-alert" aria-label="' +
      t('alert') +
      '">' +
      '<option value="all">' +
      t('all') +
      '</option>' +
      '<option value="healthy">' +
      t('healthy') +
      '</option>' +
      '<option value="warning">' +
      t('warning') +
      '</option>' +
      '<option value="critical">' +
      t('critical') +
      '</option>' +
      '</select>' +
      '<button type="button" id="dcams-lang">' +
      t('language') +
      ': ' +
      state.language.toUpperCase() +
      '</button>' +
      '</div>';

    var body = document.createElement('div');
    body.className = 'dcams-body';
    body.innerHTML =
      '<section class="dcams-panel" aria-label="Map panel">' +
      '<div class="dcams-map-wrapper" id="dcams-map-wrapper">' +
      '<div class="dcams-map-layer" id="dcams-map-layer"></div>' +
      '</div>' +
      '</section>' +
      '<aside class="dcams-panel dcams-details" aria-live="polite" aria-label="Details panel">' +
      '<div class="dcams-card" id="dcams-details"></div>' +
      '</aside>';

    var toast = document.createElement('div');
    toast.className = 'dcams-toast';
    toast.id = 'dcams-toast';

    var modal = document.createElement('div');
    modal.className = 'dcams-modal';
    modal.id = 'dcams-modal';
    modal.innerHTML =
      '<div class="dcams-modal-content" role="dialog" aria-modal="true">' +
      '<h3>' +
      t('inspectorUpdate') +
      '</h3>' +
      '<label for="dcams-battery">' +
      t('capacity') +
      ' (%)</label>' +
      '<input type="number" id="dcams-battery" min="0" max="100" />' +
      '<label for="dcams-health">' +
      t('status') +
      '</label>' +
      '<select id="dcams-health">' +
      '<option value="Healthy">' +
      t('healthy') +
      '</option>' +
      '<option value="Warning">' +
      t('warning') +
      '</option>' +
      '<option value="Critical">' +
      t('critical') +
      '</option>' +
      '</select>' +
      '<label for="dcams-comment">Comment</label>' +
      '<textarea id="dcams-comment" rows="3"></textarea>' +
      '<div class="dcams-modal-actions">' +
      '<button type="button" id="dcams-cancel">' +
      t('cancel') +
      '</button>' +
      '<button type="button" id="dcams-save">' +
      t('apply') +
      '</button>' +
      '</div>' +
      '</div>';

    shell.appendChild(topbar);
    shell.appendChild(body);
    shell.appendChild(toast);
    shell.appendChild(modal);
    root.appendChild(shell);

    applyDirection();
  }

  function applyDirection() {
    var shell = root.querySelector('.dcams-shell');
    if (!shell) {
      return;
    }
    if (state.language === 'ar') {
      shell.classList.add('dcams-rtl');
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
    } else {
      shell.classList.remove('dcams-rtl');
      document.documentElement.setAttribute('dir', 'ltr');
      document.documentElement.setAttribute('lang', 'en');
    }
  }

  function showToast(message) {
    var toast = document.getElementById('dcams-toast');
    if (!toast) {
      return;
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(function () {
      toast.classList.remove('show');
    }, 4000);
  }

  function bindUI() {
    var tabs = root.querySelectorAll('.dcams-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        state.activeTab = tab.getAttribute('data-tab');
        state.selectedRackId = null;
        state.selectedUpsId = null;
        updateTabs();
        renderMap();
        renderDetails();
      });
    });

    var search = document.getElementById('dcams-search');
    var occupancy = document.getElementById('dcams-occupancy');
    var brand = document.getElementById('dcams-brand');
    var alertSelect = document.getElementById('dcams-alert');
    var langButton = document.getElementById('dcams-lang');

    search.addEventListener('input', function () {
      state.filters.search = search.value.trim().toLowerCase();
      applyFilters();
    });

    occupancy.addEventListener('change', function () {
      state.filters.occupancy = occupancy.value;
      applyFilters();
    });

    brand.addEventListener('change', function () {
      state.filters.brand = brand.value;
      applyFilters();
    });

    alertSelect.addEventListener('change', function () {
      state.filters.alert = alertSelect.value;
      applyFilters();
    });

    langButton.addEventListener('click', function () {
      state.language = state.language === 'en' ? 'ar' : 'en';
      renderShell();
      bindUI();
      hydrateUI();
    });
  }

  function updateTabs() {
    var tabs = root.querySelectorAll('.dcams-tab');
    tabs.forEach(function (tab) {
      var isActive = tab.getAttribute('data-tab') === state.activeTab;
      tab.classList.toggle('active', isActive);
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  }

  function applyFilters() {
    if (!state.data) {
      return;
    }
    var rackElements = root.querySelectorAll('[data-rack-id]');
    var racksById = state.data.racks.reduce(function (acc, rack) {
      acc[rack.RackId] = rack;
      return acc;
    }, {});

    rackElements.forEach(function (element) {
      var rackId = element.getAttribute('data-rack-id');
      var rack = racksById[rackId];
      if (!rack) {
        return;
      }
      var metrics = getRackMetrics(rackId);
      var rackAssets = metrics.assets;
      var occupancyRate = metrics.occupancyRate;
      var matchesSearch =
        !state.filters.search || rackId.toLowerCase().includes(state.filters.search);
      var matchesOccupancy =
        state.filters.occupancy === 'all' ||
        (state.filters.occupancy === 'occupied' && occupancyRate > 0) ||
        (state.filters.occupancy === 'empty' && occupancyRate === 0);
      var brands = rackAssets.map(function (asset) {
        return asset.Brand;
      });
      var matchesBrand =
        state.filters.brand === 'all' || brands.indexOf(state.filters.brand) !== -1;
      var statusValues = rackAssets.map(function (asset) {
        return (asset.Status || '').toLowerCase();
      });
      var matchesAlert =
        state.filters.alert === 'all' ||
        statusValues.indexOf(state.filters.alert) !== -1;

      var isVisible = matchesSearch && matchesOccupancy && matchesBrand && matchesAlert;
      element.classList.toggle('filtered-out', !isVisible);
    });
  }

  function hydrateBrandFilter() {
    var select = document.getElementById('dcams-brand');
    if (!select || !state.data) {
      return;
    }
    var brands = state.data.assets
      .map(function (asset) {
        return asset.Brand;
      })
      .filter(function (item, index, self) {
        return item && self.indexOf(item) === index;
      });
    select.innerHTML = '<option value="all">' + t('all') + '</option>';
    brands.forEach(function (brand) {
      var option = document.createElement('option');
      option.value = brand;
      option.textContent = brand;
      select.appendChild(option);
    });
  }

  function hydrateUI() {
    updateTabs();
    renderMap();
    renderDetails();
    hydrateBrandFilter();
    applyFilters();
  }

  function renderMap() {
    var mapLayer = document.getElementById('dcams-map-layer');
    if (!mapLayer || !state.data) {
      return;
    }
    mapLayer.innerHTML = '';

    var svgPath =
      state.activeTab === 'dc'
        ? 'assets/svg/dc-layout.svg'
        : 'assets/svg/ups-layout.svg';

    fetch(basePath + svgPath)
      .then(function (response) {
        return response.text();
      })
      .then(function (svgText) {
        mapLayer.innerHTML = svgText;
        var svg = mapLayer.querySelector('svg');
        if (!svg) {
          return;
        }
        if (state.activeTab === 'dc') {
          bindRackMarkers(svg);
          renderConnections(svg);
        } else {
          bindUpsMarkers(svg);
        }
        applyFilters();
      })
      .catch(function () {
        mapLayer.innerHTML = '<div class="dcams-card">Map load failed.</div>';
      });
  }

  function bindRackMarkers(svg) {
    var racks = state.data.racks;
    racks.forEach(function (rack) {
      var element = svg.querySelector('#rack-' + rack.RackId);
      if (!element) {
        return;
      }
      element.classList.add('dcams-map-marker');
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', rack.RackId);
      element.setAttribute('data-rack-id', rack.RackId);
      element.addEventListener('click', function () {
        state.selectedRackId = rack.RackId;
        state.selectedUpsId = null;
        highlightSelection();
        renderDetails();
      });
      element.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          element.click();
        }
      });
      updateRackVisual(element, rack);
    });
  }

  function bindUpsMarkers(svg) {
    var upsItems = state.data.ups;
    upsItems.forEach(function (ups) {
      var element = svg.querySelector('#ups-' + ups.UpsId);
      if (!element) {
        return;
      }
      element.classList.add('dcams-map-marker', 'dcams-ups-marker');
      element.classList.add(statusClass(ups.Status));
      element.setAttribute('tabindex', '0');
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', ups.UpsId);
      element.setAttribute('data-ups-id', ups.UpsId);
      element.addEventListener('click', function () {
        state.selectedUpsId = ups.UpsId;
        state.selectedRackId = null;
        highlightSelection();
        renderDetails();
      });
      element.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          element.click();
        }
      });
    });
  }

  function highlightSelection() {
    var selected = root.querySelectorAll('.dcams-map-marker');
    selected.forEach(function (el) {
      el.classList.remove('selected');
    });
    if (state.selectedRackId) {
      var rack = root.querySelector('[data-rack-id="' + state.selectedRackId + '"]');
      if (rack) {
        rack.classList.add('selected');
      }
    }
    if (state.selectedUpsId) {
      var ups = root.querySelector('[data-ups-id="' + state.selectedUpsId + '"]');
      if (ups) {
        ups.classList.add('selected');
      }
    }
  }

  function updateRackVisual(element, rack) {
    var rackAssets = state.data.assets.filter(function (asset) {
      return asset.RackId === rack.RackId;
    });
    var status = rackAssets.some(function (asset) {
      return asset.Status === 'Critical';
    })
      ? 'critical'
      : rackAssets.some(function (asset) {
          return asset.Status === 'Warning';
        })
      ? 'warning'
      : 'healthy';
    element.classList.add(statusClass(status));
  }

  function statusClass(status) {
    if (!status) {
      return 'healthy';
    }
    var value = status.toLowerCase();
    if (value === 'critical') {
      return 'critical';
    }
    if (value === 'warning') {
      return 'warning';
    }
    return 'healthy';
  }

  function renderConnections(svg) {
    var layer = svg.querySelector('#connection-layer');
    if (!layer) {
      return;
    }
    layer.innerHTML = '';
    if (!state.data.connections || !state.data.connections.length) {
      return;
    }

    state.data.connections.forEach(function (connection) {
      if (!connection.PathPoints || !connection.PathPoints.length) {
        return;
      }
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      var d = connection.PathPoints.map(function (pt, index) {
        return (index === 0 ? 'M' : 'L') + pt.x + ' ' + pt.y;
      }).join(' ');
      path.setAttribute('d', d);
      path.setAttribute('class',
        'dcams-connection-path ' + statusClass(connection.Status)
      );
      path.setAttribute('data-connection-id', connection.ConnectionId);
      layer.appendChild(path);
    });
  }

  function renderDetails() {
    var details = document.getElementById('dcams-details');
    if (!details) {
      return;
    }
    if (!state.data) {
      details.textContent = '';
      return;
    }

    if (state.selectedRackId) {
      renderRackDetails(details);
      return;
    }

    if (state.selectedUpsId) {
      renderUpsDetails(details);
      return;
    }

    details.innerHTML =
      '<div class="dcams-card">' +
      '<h3>' +
      t('details') +
      '</h3>' +
      '<p>' +
      t('noSelection') +
      '</p>' +
      '</div>';
  }

  function renderRackDetails(details) {
    var rack = state.data.racks.filter(function (item) {
      return item.RackId === state.selectedRackId;
    })[0];
    var metrics = getRackMetrics(state.selectedRackId);
    var assets = metrics.assets;
    var occupancy = Math.round(metrics.occupancyRate * 100);
    var totalPower = assets.reduce(function (sum, asset) {
      return sum + (asset.PowerLoadKW || 0);
    }, 0);
    var totalPhysical = assets.reduce(function (sum, asset) {
      return sum + (asset.PhysicalLoadKG || 0);
    }, 0);

    var fragment = document.createDocumentFragment();

    var overview = document.createElement('div');
    overview.className = 'dcams-card';
    overview.innerHTML =
      '<h3>' +
      t('rackOverview') +
      '</h3>' +
      '<div class="dcams-kpis">' +
      '<div class="dcams-kpi"><strong>' +
      rack.RackId +
      '</strong><div>' +
      rack.TotalSlots +
      'U</div></div>' +
      '<div class="dcams-kpi">' +
      t('occupied') +
      ': ' +
      occupancy +
      '%</div>' +
      '<div class="dcams-kpi">Power: ' +
      totalPower.toFixed(1) +
      ' kW</div>' +
      '<div class="dcams-kpi">Physical: ' +
      totalPhysical.toFixed(1) +
      ' kg</div>' +
      '</div>';

    var slotCard = document.createElement('div');
    slotCard.className = 'dcams-card';
    slotCard.innerHTML = '<h3>' + t('slotGrid') + '</h3>';
    var slotGrid = buildSlotGrid(rack.TotalSlots, assets);
    slotCard.appendChild(slotGrid);

    var deviceCard = document.createElement('div');
    deviceCard.className = 'dcams-card';
    deviceCard.innerHTML = '<h3>' + t('deviceDetails') + '</h3>';
    if (!assets.length) {
      deviceCard.innerHTML += '<p>' + t('empty') + '</p>';
    } else {
      assets.forEach(function (asset) {
        var div = document.createElement('div');
        div.className = 'dcams-asset-block ' + statusClass(asset.Status);
        div.innerHTML =
          '<strong>' +
          asset.DeviceType +
          '</strong> - ' +
          asset.Brand +
          ' ' +
          asset.Model +
          '<div>' +
          asset.Serial +
          '</div>' +
          '<div>' +
          asset.PowerLoadKW +
          ' kW | ' +
          asset.PhysicalLoadKG +
          ' kg</div>' +
          '<div>' +
          t('status') +
          ': ' +
          asset.Status +
          '</div>' +
          '<div>' +
          t('lastUpdated') +
          ': ' +
          formatDate(asset.UpdatedAt) +
          '</div>';
        deviceCard.appendChild(div);
      });
    }

    fragment.appendChild(overview);
    fragment.appendChild(slotCard);
    fragment.appendChild(deviceCard);

    details.innerHTML = '';
    details.appendChild(fragment);
  }

  function buildSlotGrid(totalSlots, assets) {
    var slotGrid = document.createElement('div');
    slotGrid.className = 'dcams-slot-grid';
    slotGrid.setAttribute('role', 'grid');
    slotGrid.style.gridTemplateRows = 'repeat(' + totalSlots + ', 14px)';

    var occupiedSlots = {};
    assets.forEach(function (asset) {
      for (var i = asset.SlotFrom; i <= asset.SlotTo; i += 1) {
        occupiedSlots[i] = asset;
      }
    });

    for (var slotIndex = totalSlots; slotIndex >= 1; slotIndex -= 1) {
      var slot = document.createElement('div');
      var asset = occupiedSlots[slotIndex];
      slot.className = 'dcams-slot ' + (asset ? 'occupied' : 'empty');
      slot.setAttribute('role', 'gridcell');
      slot.setAttribute('tabindex', '0');
      slot.setAttribute(
        'aria-label',
        'U' + slotIndex + (asset ? ' ' + asset.DeviceType : ' Empty')
      );
      slot.style.gridRow = totalSlots - slotIndex + 1;
      var label = document.createElement('div');
      label.className = 'dcams-slot-label';
      label.textContent = 'U' + slotIndex;
      slot.appendChild(label);
      slotGrid.appendChild(slot);
    }

    assets.forEach(function (asset) {
      var span = asset.SlotTo - asset.SlotFrom + 1;
      var block = document.createElement('div');
      block.className = 'dcams-asset-block ' + statusClass(asset.Status);
      block.style.gridRow = totalSlots - asset.SlotTo + 1 + ' / span ' + span;
      block.innerHTML =
        '<strong>' +
        asset.AssetId +
        '</strong> — ' +
        asset.Brand +
        ' ' +
        asset.Model;
      slotGrid.appendChild(block);
    });

    return slotGrid;
  }

  function getRackMetrics(rackId) {
    var rack = state.data.racks.filter(function (item) {
      return item.RackId === rackId;
    })[0];
    var assets = state.data.assets.filter(function (asset) {
      return asset.RackId === rackId;
    });
    var occupiedSlots = {};
    assets.forEach(function (asset) {
      for (var i = asset.SlotFrom; i <= asset.SlotTo; i += 1) {
        occupiedSlots[i] = true;
      }
    });
    var occupiedCount = Object.keys(occupiedSlots).length;
    var totalSlots = rack ? rack.TotalSlots : 0;
    var occupancyRate = totalSlots ? occupiedCount / totalSlots : 0;
    return { assets: assets, occupancyRate: occupancyRate, occupiedCount: occupiedCount };
  }

  function renderUpsDetails(details) {
    var ups = state.data.ups.filter(function (item) {
      return item.UpsId === state.selectedUpsId;
    })[0];
    var batteries = state.data.batteries.filter(function (item) {
      return item.UpsId === state.selectedUpsId;
    });

    var fragment = document.createDocumentFragment();

    var upsCard = document.createElement('div');
    upsCard.className = 'dcams-card';
    upsCard.innerHTML =
      '<h3>' +
      t('upsDetails') +
      '</h3>' +
      '<div class="dcams-status-indicator">' +
      '<span class="dcams-status-dot ' +
      statusClass(ups.Status) +
      '"></span>' +
      '<span>' +
      ups.UpsId +
      ' (' +
      ups.CapacityKVA +
      ' kVA)</span>' +
      '</div>' +
      '<p>' +
      t('lastUpdated') +
      ': ' +
      formatDate(ups.LastUpdated) +
      '</p>';

    var batteryCard = document.createElement('div');
    batteryCard.className = 'dcams-card';
    batteryCard.innerHTML = '<h3>Battery Health</h3>';

    batteries.forEach(function (battery) {
      var div = document.createElement('div');
      div.className = 'dcams-kpi';
      div.innerHTML =
        '<strong>' +
        battery.BatteryId +
        '</strong> — ' +
        battery.CapacityPct +
        '% (' +
        battery.Health +
        ')<div>' +
        battery.InspectorComment +
        '</div><small>' +
        formatDate(battery.UpdatedAt) +
        '</small>';
      batteryCard.appendChild(div);
    });

    if (state.role === 'inspector') {
      var updateBtn = document.createElement('button');
      updateBtn.type = 'button';
      updateBtn.textContent = t('update');
      updateBtn.addEventListener('click', function () {
        openModal();
      });
      upsCard.appendChild(updateBtn);
    } else {
      var note = document.createElement('div');
      note.className = 'dcams-pill';
      note.textContent = t('inspectorOnly');
      upsCard.appendChild(note);
    }

    fragment.appendChild(upsCard);
    fragment.appendChild(batteryCard);

    details.innerHTML = '';
    details.appendChild(fragment);
  }

  function openModal() {
    var modal = document.getElementById('dcams-modal');
    if (!modal) {
      return;
    }
    modal.classList.add('active');
    var cancel = document.getElementById('dcams-cancel');
    var save = document.getElementById('dcams-save');
    cancel.onclick = function () {
      modal.classList.remove('active');
    };
    save.onclick = function () {
      var capacity = document.getElementById('dcams-battery').value;
      var health = document.getElementById('dcams-health').value;
      var comment = document.getElementById('dcams-comment').value;
      submitBatteryUpdate(capacity, health, comment);
      modal.classList.remove('active');
    };
  }

  function submitBatteryUpdate(capacity, health, comment) {
    if (!DCAMS.services || !DCAMS.services.sharepointService) {
      showToast('SharePoint service unavailable');
      return;
    }
    var payload = {
      UpsId: state.selectedUpsId,
      CapacityPct: Number(capacity),
      Health: health,
      InspectorComment: comment,
      UpdatedAt: new Date().toISOString()
    };
    DCAMS.services.sharepointService
      .createBatteryEntry(payload)
      .then(function () {
        showToast('UPS battery updated.');
        refreshData();
      })
      .catch(function () {
        showToast('Unable to update UPS battery.');
      });
  }

  function refreshData() {
    loadData()
      .then(function (data) {
        state.data = data;
        hydrateBrandFilter();
        renderMap();
        renderDetails();
      })
      .catch(function () {
        showToast('Data refresh failed.');
      });
  }

  function loadData() {
    if (DCAMS.config.DATA_SOURCE === 'sharepoint') {
      return DCAMS.services.sharepointService.getAllData();
    }
    if (window.location && window.location.protocol === 'file:') {
      return Promise.resolve(getEmbeddedSampleData());
    }
    return fetch(basePath + 'data/sampleData.json')
      .then(function (response) {
        return response.json();
      })
      .then(function (data) {
        return data;
      });
  }

  function updateLiveDOM(changes) {
    var mapLayer = document.getElementById('dcams-map-layer');
    if (!mapLayer || !state.data) {
      return;
    }
    var svg = mapLayer.querySelector('svg');
    if (!svg) {
      return;
    }

    var affectedRackIds = {};
    changes.assets.forEach(function (assetId) {
      var asset = state.data.assets.filter(function (item) {
        return item.AssetId === assetId;
      })[0];
      if (asset) {
        affectedRackIds[asset.RackId] = true;
      }
    });

    changes.racks.concat(Object.keys(affectedRackIds)).forEach(function (rackId) {
      var rack = state.data.racks.filter(function (item) {
        return item.RackId === rackId;
      })[0];
      if (!rack) {
        return;
      }
      var element = svg.querySelector('#rack-' + rackId);
      if (element) {
        element.classList.remove('healthy', 'warning', 'critical');
        updateRackVisual(element, rack);
      }
    });

    changes.ups.forEach(function (upsId) {
      var ups = state.data.ups.filter(function (item) {
        return item.UpsId === upsId;
      })[0];
      if (!ups) {
        return;
      }
      var element = svg.querySelector('#ups-' + upsId);
      if (element) {
        element.classList.remove('healthy', 'warning', 'critical');
        element.classList.add(statusClass(ups.Status));
      }
    });

    if (changes.connections.length && state.activeTab === 'dc') {
      renderConnections(svg);
    }

    if (state.selectedRackId || state.selectedUpsId) {
      renderDetails();
    }
    applyFilters();
  }

  function initRealtime() {
    if (!DCAMS.services || !DCAMS.services.realtime) {
      return;
    }
    DCAMS.services.realtime.startPolling(
      function () {
        return loadData();
      },
      state.data,
      function (updatedData, changes) {
        state.data = updatedData;
        hydrateBrandFilter();
        updateLiveDOM(changes);
      },
      function () {
        showToast('Live data unavailable. Showing last known state.');
      }
    );
  }

  function initRBAC() {
    if (!DCAMS.services || !DCAMS.services.rbac) {
      return Promise.resolve({ role: 'viewer' });
    }
    return DCAMS.services.rbac.getCurrentRole();
  }

  function init() {
    renderShell();
    bindUI();

    initRBAC()
      .then(function (rbacInfo) {
        state.role = rbacInfo.role || 'viewer';
        if (rbacInfo.role === 'none') {
          root.innerHTML = '<div class="dcams-card">' + t('unauthorized') + '</div>';
          return;
        }
        return loadData().then(function (data) {
          state.data = data;
          hydrateUI();
          initRealtime();
        });
      })
      .catch(function () {
        root.innerHTML = '<div class="dcams-card">' + t('unauthorized') + '</div>';
      });
  }

  loadScriptsSequential(
    ['services/sharepointService.js', 'services/rbac.js', 'services/realtime.js'],
    init
  );

  function getEmbeddedSampleData() {
    return {
      racks: [
        { RackId: 'R01', LocationX: 60, LocationY: 80, TotalSlots: 42, PowerCapacity: 12, PhysicalCapacity: 400, Notes: 'Row A' },
        { RackId: 'R02', LocationX: 140, LocationY: 80, TotalSlots: 42, PowerCapacity: 12, PhysicalCapacity: 400, Notes: 'Row A' },
        { RackId: 'R03', LocationX: 220, LocationY: 80, TotalSlots: 42, PowerCapacity: 14, PhysicalCapacity: 450, Notes: 'Row A' },
        { RackId: 'R04', LocationX: 300, LocationY: 80, TotalSlots: 42, PowerCapacity: 14, PhysicalCapacity: 450, Notes: 'Row A' },
        { RackId: 'R05', LocationX: 60, LocationY: 190, TotalSlots: 42, PowerCapacity: 10, PhysicalCapacity: 380, Notes: 'Row B' },
        { RackId: 'R06', LocationX: 140, LocationY: 190, TotalSlots: 42, PowerCapacity: 10, PhysicalCapacity: 380, Notes: 'Row B' },
        { RackId: 'R07', LocationX: 220, LocationY: 190, TotalSlots: 42, PowerCapacity: 11, PhysicalCapacity: 390, Notes: 'Row B' },
        { RackId: 'R08', LocationX: 300, LocationY: 190, TotalSlots: 42, PowerCapacity: 11, PhysicalCapacity: 390, Notes: 'Row B' },
        { RackId: 'R09', LocationX: 60, LocationY: 300, TotalSlots: 42, PowerCapacity: 12, PhysicalCapacity: 420, Notes: 'Row C' },
        { RackId: 'R10', LocationX: 140, LocationY: 300, TotalSlots: 42, PowerCapacity: 12, PhysicalCapacity: 420, Notes: 'Row C' },
        { RackId: 'R11', LocationX: 220, LocationY: 300, TotalSlots: 42, PowerCapacity: 12, PhysicalCapacity: 420, Notes: 'Row C' },
        { RackId: 'R12', LocationX: 300, LocationY: 300, TotalSlots: 42, PowerCapacity: 12, PhysicalCapacity: 420, Notes: 'Row C' }
      ],
      assets: [
        { AssetId: 'SRV-1001', RackId: 'R01', SlotFrom: 1, SlotTo: 2, DeviceType: 'Server', Brand: 'Dell', Model: 'R740', Serial: 'DX123', PowerLoadKW: 0.8, PhysicalLoadKG: 18, Consumption: 'High', Status: 'Healthy', UpdatedAt: '2024-08-24T12:00:00Z' },
        { AssetId: 'SRV-1002', RackId: 'R01', SlotFrom: 10, SlotTo: 12, DeviceType: 'Storage', Brand: 'NetApp', Model: 'FAS', Serial: 'NA456', PowerLoadKW: 1.1, PhysicalLoadKG: 28, Consumption: 'Medium', Status: 'Warning', UpdatedAt: '2024-08-24T12:05:00Z' },
        { AssetId: 'SRV-1003', RackId: 'R03', SlotFrom: 5, SlotTo: 6, DeviceType: 'Server', Brand: 'HPE', Model: 'DL380', Serial: 'HP789', PowerLoadKW: 0.7, PhysicalLoadKG: 16, Consumption: 'Low', Status: 'Healthy', UpdatedAt: '2024-08-24T12:12:00Z' },
        { AssetId: 'SRV-1004', RackId: 'R04', SlotFrom: 15, SlotTo: 20, DeviceType: 'Switch', Brand: 'Cisco', Model: 'Nexus', Serial: 'CS110', PowerLoadKW: 0.6, PhysicalLoadKG: 12, Consumption: 'Low', Status: 'Healthy', UpdatedAt: '2024-08-24T12:16:00Z' },
        { AssetId: 'SRV-1005', RackId: 'R06', SlotFrom: 30, SlotTo: 32, DeviceType: 'Server', Brand: 'Dell', Model: 'R640', Serial: 'DX222', PowerLoadKW: 0.9, PhysicalLoadKG: 20, Consumption: 'Medium', Status: 'Critical', UpdatedAt: '2024-08-24T12:21:00Z' },
        { AssetId: 'SRV-1006', RackId: 'R08', SlotFrom: 1, SlotTo: 4, DeviceType: 'Firewall', Brand: 'Palo Alto', Model: 'PA-5220', Serial: 'PA988', PowerLoadKW: 0.5, PhysicalLoadKG: 14, Consumption: 'Low', Status: 'Healthy', UpdatedAt: '2024-08-24T12:35:00Z' }
      ],
      connections: [
        {
          ConnectionId: 'CON-1',
          FromAssetId: 'SRV-1001',
          ToEndpointLabel: 'Core Switch',
          CableType: 'Fiber',
          PortFrom: 'Eth0',
          PortTo: 'Port-12',
          PathPoints: [
            { x: 90, y: 90 },
            { x: 140, y: 120 },
            { x: 200, y: 90 }
          ],
          Notes: 'Primary uplink',
          Status: 'Healthy'
        },
        {
          ConnectionId: 'CON-2',
          FromAssetId: 'SRV-1002',
          ToEndpointLabel: 'SAN',
          CableType: 'Fiber',
          PortFrom: 'Eth1',
          PortTo: 'Port-08',
          PathPoints: [
            { x: 120, y: 140 },
            { x: 200, y: 160 },
            { x: 260, y: 130 }
          ],
          Notes: 'Storage uplink',
          Status: 'Warning'
        }
      ],
      ups: [
        { UpsId: 'UPS01', LocationX: 120, LocationY: 80, CapacityKVA: 120, Status: 'Healthy', LastUpdated: '2024-08-24T12:22:00Z', Notes: 'Main' },
        { UpsId: 'UPS02', LocationX: 240, LocationY: 140, CapacityKVA: 80, Status: 'Warning', LastUpdated: '2024-08-24T12:25:00Z', Notes: 'Backup' },
        { UpsId: 'UPS03', LocationX: 360, LocationY: 200, CapacityKVA: 100, Status: 'Critical', LastUpdated: '2024-08-24T12:29:00Z', Notes: 'Secondary' }
      ],
      batteries: [
        { BatteryId: 'BAT-01', UpsId: 'UPS01', CapacityPct: 92, Health: 'Healthy', InspectorComment: 'All good', UpdatedBy: 'Inspector A', UpdatedAt: '2024-08-24T12:10:00Z' },
        { BatteryId: 'BAT-02', UpsId: 'UPS02', CapacityPct: 76, Health: 'Warning', InspectorComment: 'Monitor voltage', UpdatedBy: 'Inspector B', UpdatedAt: '2024-08-24T12:15:00Z' },
        { BatteryId: 'BAT-03', UpsId: 'UPS03', CapacityPct: 55, Health: 'Critical', InspectorComment: 'Replace within 24h', UpdatedBy: 'Inspector C', UpdatedAt: '2024-08-24T12:20:00Z' }
      ]
    };
  }
})();
