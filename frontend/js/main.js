// LifeLink - Global UI Helpers & Formatters

function showToast(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
  }

  const bgClass = type === 'success' ? 'bg-success text-white' :
                  type === 'danger' ? 'bg-danger text-white' :
                  type === 'warning' ? 'bg-warning text-dark' : 'bg-primary text-white';

  const toastId = 'toast_' + Date.now();
  const toastHtml = `
    <div id="${toastId}" class="toast align-items-center ${bgClass} border-0 mb-2 shadow" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body d-flex align-items-center gap-2">
          <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : type === 'danger' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill'}"></i>
          <span>${message}</span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML('beforeend', toastHtml);
  const element = document.getElementById(toastId);
  const bsToast = new bootstrap.Toast(element, { delay: 4000 });
  bsToast.show();

  element.addEventListener('hidden.bs.toast', () => {
    element.remove();
  });
}

function formatINR(val) {
  if (val === null || val === undefined) return '₹0.00';
  const num = typeof val === 'number' ? val : parseFloat(val);
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return isoStr;
  }
}

function getWorkflowBadge(status) {
  const map = {
    POTENTIAL_DONOR_IDENTIFIED: '<span class="badge bg-secondary badge-pulse">Donor Identified</span>',
    BRAIN_DEATH_FIRST_CERTIFICATION: '<span class="badge bg-warning text-dark">Form 8 Certified (1st)</span>',
    BRAIN_DEATH_SECOND_CERTIFICATION: '<span class="badge bg-warning text-dark">Form 10 Certified (2nd)</span>',
    LEGAL_HEIR_CONSENT_OBTAINED: '<span class="badge bg-info text-dark">Form 6 Consent Signed</span>',
    MEDICO_LEGAL_NOC_OBTAINED: '<span class="badge bg-info text-dark">Police MLC NOC Clear</span>',
    ORGAN_ALLOCATION_COORDINATED: '<span class="badge bg-primary">Allocation Coordinated</span>',
    RETRIEVAL_COMMENCED: '<span class="badge bg-primary">OT Retrieval Underway</span>',
    IN_TRANSIT_TO_RECIPIENT_CENTER: '<span class="badge bg-danger badge-pulse">In Transit</span>',
    ORGAN_DELIVERED_AT_OT: '<span class="badge bg-success">Delivered at OT</span>',
    TRANSPLANT_COMMENCED: '<span class="badge bg-success">Transplant Commenced</span>',
    CASE_COMPLETED: '<span class="badge bg-success"><i class="bi bi-check-all me-1"></i>Completed</span>',
    CASE_DECLINED: '<span class="badge bg-dark">Family Declined</span>',
    CASE_MEDICALLY_UNSUITABLE: '<span class="badge bg-secondary">Medically Unsuitable</span>'
  };
  return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function getAssessmentBadge(status) {
  const map = {
    PENDING: '<span class="badge bg-warning text-dark">Evaluating</span>',
    VIABLE: '<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Viable</span>',
    MARGINAL: '<span class="badge bg-info text-dark">Marginal Viability</span>',
    NON_VIABLE: '<span class="badge bg-danger">Non-Viable</span>',
    RETRACTED: '<span class="badge bg-secondary">Retracted</span>'
  };
  return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function getTransportBadge(status) {
  const map = {
    ASSIGNED: '<span class="badge bg-secondary">Assigned</span>',
    ACCEPTED: '<span class="badge bg-info text-dark">Driver Accepted</span>',
    EN_ROUTE_TO_PICKUP: '<span class="badge bg-primary">En Route to Pickup</span>',
    ARRIVED_AT_PICKUP: '<span class="badge bg-primary">At Donor Hospital</span>',
    ORGAN_LOADED: '<span class="badge bg-warning text-dark">Organ Loaded</span>',
    IN_TRANSIT: '<span class="badge bg-danger badge-pulse">In Transit</span>',
    GREEN_CORRIDOR_ACTIVE: '<span class="badge bg-success badge-pulse"><i class="bi bi-shield-check me-1"></i>Green Corridor Active</span>',
    DELAYED: '<span class="badge bg-danger">Traffic Delayed</span>',
    ARRIVED_AT_DESTINATION: '<span class="badge bg-info text-dark">Arrived at Recipient</span>',
    HANDOVER_COMPLETED: '<span class="badge bg-success"><i class="bi bi-check2-all me-1"></i>OT Handover Signed</span>',
    CANCELLED: '<span class="badge bg-dark">Cancelled</span>',
    ABORTED: '<span class="badge bg-danger">Aborted</span>'
  };
  return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}
