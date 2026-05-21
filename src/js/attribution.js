(function () {
  'use strict';

  var STORAGE_KEY = 'ff_attribution';
  var GA4_MEASUREMENT_ID = 'G-K7C98BWXMM';

  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : '';
  }

  function getGaClientId() {
    var ga = getCookie('_ga');
    if (!ga) return '';
    var parts = ga.split('.');
    return parts.length >= 4 ? parts.slice(-2).join('.') : '';
  }

  function getGaSessionId() {
    var ga = getCookie('_ga_' + GA4_MEASUREMENT_ID.replace('G-', ''));
    if (!ga) return '';
    var parts = ga.split('.');
    return parts.length >= 3 ? parts[2] : '';
  }

  function getUrlParams() {
    var params = {};
    var search = window.location.search.substring(1);
    if (!search) return params;
    search.split('&').forEach(function (pair) {
      var idx = pair.indexOf('=');
      if (idx === -1) return;
      var key = decodeURIComponent(pair.slice(0, idx));
      var val = decodeURIComponent(pair.slice(idx + 1));
      params[key] = val;
    });
    return params;
  }

  function captureFirstTouch() {
    var existing;
    try {
      existing = sessionStorage.getItem(STORAGE_KEY);
    } catch (e) {
      existing = null;
    }
    if (existing) {
      try {
        return JSON.parse(existing);
      } catch (e) {
        // fall through and re-capture
      }
    }

    var params = getUrlParams();
    var attribution = {
      utm_source: params.utm_source || '',
      utm_medium: params.utm_medium || '',
      utm_campaign: params.utm_campaign || '',
      utm_content: params.utm_content || '',
      utm_term: params.utm_term || '',
      gclid: params.gclid || '',
      gbraid: params.gbraid || '',
      wbraid: params.wbraid || '',
      fbclid: params.fbclid || '',
      referrer: document.referrer || '',
      landing_page: window.location.href,
      landing_timestamp: new Date().toISOString(),
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution));
    } catch (e) {
      // sessionStorage can throw in private browsing — fail silently
    }

    return attribution;
  }

  function populateFormFields(form) {
    if (!form) return;

    var attribution = captureFirstTouch();
    var fields = {
      ga_client_id: getGaClientId(),
      ga_session_id: getGaSessionId(),
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
      utm_content: attribution.utm_content,
      utm_term: attribution.utm_term,
      gclid: attribution.gclid,
      gbraid: attribution.gbraid,
      wbraid: attribution.wbraid,
      fbclid: attribution.fbclid,
      referrer: attribution.referrer,
      landing_page: attribution.landing_page,
      landing_timestamp: attribution.landing_timestamp,
      submission_page: window.location.href,
      submission_timestamp: new Date().toISOString(),
    };

    Object.keys(fields).forEach(function (name) {
      var input = form.querySelector('input[name="' + name + '"]');
      if (!input) {
        input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        form.appendChild(input);
      }
      input.value = fields[name] || '';
    });
  }

  function init() {
    captureFirstTouch();

    document.querySelectorAll('form[data-netlify], form[netlify]').forEach(function (form) {
      populateFormFields(form);
      form.addEventListener('submit', function () {
        populateFormFields(form);
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
