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

  // Build the tracker panel
  var panel = document.createElement('div');
  panel.id = 'exemption-tracker-panel';
  panel.style.cssText = 'background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 14px;';

  var title = document.createElement('h5');
  title.textContent = 'Exemption Usage Summary';
  title.style.cssText = 'margin: 0 0 12px 0; color: #495057;';
  panel.appendChild(title);

  var table = document.createElement('table');
  table.style.cssText = 'width: 100%; border-collapse: collapse;';

  // Header row
  var thead = '<thead><tr style="border-bottom: 2px solid #dee2e6;">' +
    '<th style="text-align:left;padding:4px 8px;">Category</th>' +
    '<th style="text-align:right;padding:4px 8px;">Limit</th>' +
    '<th style="text-align:right;padding:4px 8px;">Claimed</th>' +
    '<th style="text-align:right;padding:4px 8px;">Remaining</th>' +
    '<th style="text-align:center;padding:4px 8px;width:100px;">Usage</th>' +
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
    var color = isUnlimited ? '#28a745' : (pct < 75 ? '#28a745' : (pct < 100 ? '#ffc107' : '#dc3545'));

    var limitStr = isUnlimited ? 'Unlimited' : '$' + limit.toLocaleString();
    var remainStr = isUnlimited ? 'Unlimited' : '$' + remaining.toLocaleString();

    var row = document.createElement('tr');
    row.style.borderBottom = '1px solid #eee';

    // Shorten the law string for display
    var shortLaw = law.length > 50 ? law.substring(0, 47) + '...' : law;

    row.innerHTML =
      '<td style="padding:4px 8px;" title="' + law + '">' + shortLaw + '</td>' +
      '<td style="text-align:right;padding:4px 8px;">' + limitStr + '</td>' +
      '<td style="text-align:right;padding:4px 8px;">$' + claimed.toLocaleString() + '</td>' +
      '<td style="text-align:right;padding:4px 8px;">' + remainStr + '</td>' +
      '<td style="padding:4px 8px;">' +
        '<div style="background:#e9ecef;border-radius:4px;height:16px;overflow:hidden;">' +
          '<div style="background:' + color + ';height:100%;width:' + (isUnlimited ? 0 : pct) + '%;transition:width 0.3s;"></div>' +
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
