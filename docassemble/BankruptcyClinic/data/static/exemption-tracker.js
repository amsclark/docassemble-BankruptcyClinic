/**
 * Exemption Tracker — Dynamic Summary Display
 *
 * Shows a running summary of exemption usage on property pages.
 * Displays limits, used amounts, and remaining amounts per category
 * with color-coded progress indicators.
 */
$(document).on('daPageLoad', function() {
  // Only show tracker on property pages that have exemption fields
  var hasExemptionField = document.querySelector('[data-saveas*="is_claiming_exemption"], [data-saveas*="has_claim"]');
  if (!hasExemptionField) return;

  // Check if tracker already exists
  if (document.getElementById('exemption-tracker-panel')) return;

  // Try to read server-side exemption_totals passed via Mako
  var trackerData = null;
  try {
    var dataEl = document.getElementById('exemption-tracker-data');
    if (dataEl) {
      trackerData = JSON.parse(dataEl.textContent);
    }
  } catch(e) {
    console.log('Exemption tracker: no server data found');
  }

  if (!trackerData || Object.keys(trackerData).length === 0) return;

  // Build the tracker panel. Presentation lives in bk-theme.css — this file
  // sets classes and a data-state, never colours, so the panel follows the
  // interview theme (including dark mode) instead of overriding it inline.
  var panel = document.createElement('div');
  panel.id = 'exemption-tracker-panel';
  panel.className = 'bk-tracker';

  var title = document.createElement('h2');
  title.textContent = 'Exemption usage so far';
  title.className = 'bk-tracker-title';
  panel.appendChild(title);

  var table = document.createElement('table');

  // Header row
  var thead = '<thead><tr>' +
    '<th>Exemption</th>' +
    '<th class="bk-num">Limit</th>' +
    '<th class="bk-num">Claimed</th>' +
    '<th class="bk-num">Left</th>' +
    '<th>Used</th>' +
    '</tr></thead>';
  table.innerHTML = thead;

  var tbody = document.createElement('tbody');

  Object.keys(trackerData).forEach(function(law) {
    var entry = trackerData[law];
    var limit = entry.limit;
    var claimed = entry.claimed;
    var remaining = entry.remaining;
    var isUnlimited = (limit === 0);

    var pct = isUnlimited ? 0 : Math.min(100, Math.round((claimed / limit) * 100));
    // Blue while there is room, grey as it runs low, red only once the cap is
    // reached — red on this interview means "this needs your attention".
    var state = isUnlimited ? 'ok' : (pct < 75 ? 'ok' : (pct < 100 ? 'near' : 'over'));

    var limitStr = isUnlimited ? '<span class="bk-tracker-unlimited">No limit</span>'
                               : '$' + limit.toLocaleString();
    var remainStr = isUnlimited ? '<span class="bk-tracker-unlimited">No limit</span>'
                                : '$' + remaining.toLocaleString();

    var row = document.createElement('tr');

    // Shorten the law string for display
    var shortLaw = law.length > 50 ? law.substring(0, 47) + '...' : law;

    row.innerHTML =
      '<td class="bk-law" title="' + law + '">' + shortLaw + '</td>' +
      '<td class="bk-num">' + limitStr + '</td>' +
      '<td class="bk-num">$' + claimed.toLocaleString() + '</td>' +
      '<td class="bk-num">' + remainStr + '</td>' +
      '<td>' +
        '<div class="bk-tracker-gauge" role="img" aria-label="' +
          (isUnlimited ? 'No limit' : pct + ' percent of this exemption used') + '">' +
          '<div class="bk-tracker-fill" data-state="' + state + '" style="width:' +
            (isUnlimited ? 0 : pct) + '%"></div>' +
        '</div>' +
      '</td>';

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  panel.appendChild(table);

  // Insert at top of the question area
  var questionArea = document.querySelector('.da-question-help') || document.querySelector('.da-page-header');
  if (questionArea) {
    questionArea.parentNode.insertBefore(panel, questionArea.nextSibling);
  } else {
    var main = document.querySelector('#daquestion') || document.querySelector('main');
    if (main) main.insertBefore(panel, main.firstChild);
  }
});
