// LifeLink - Authentication & Session Manager
const auth = {
  getUser() {
    const raw = localStorage.getItem('lifelink_user');
    return raw ? JSON.parse(raw) : null;
  },

  isLoggedIn() {
    return !!localStorage.getItem('lifelink_token');
  },

  logout() {
    localStorage.removeItem('lifelink_token');
    localStorage.removeItem('lifelink_user');
    window.location.href = 'login.html';
  },

  demoAccounts: {
    coordinator: { email: 'coordinator@lifelink.org', password: 'Password@123', role: 'Transplant Coordinator' },
    doctor: { email: 'icu.doctor@lifelink.org', password: 'Password@123', role: 'ICU Doctor' },
    traffic: { email: 'police.traffic@lifelink.org', password: 'Password@123', role: 'Traffic Police Lead' },
    driver: { email: 'driver.fast@lifelink.org', password: 'Password@123', role: 'Organ Transport Driver' },
    counselor: { email: 'counselor@lifelink.org', password: 'Password@123', role: 'Bereavement Counselor' },
    finance: { email: 'finance@lifelink.org', password: 'Password@123', role: 'Finance Reviewer' },
    contributor: { email: 'donor.family@lifelink.org', password: 'Password@123', role: 'Public Contributor' }
  },

  async quickLogin(personaKey) {
    const persona = this.demoAccounts[personaKey];
    if (!persona) return;
    try {
      await api.login(persona.email, persona.password);
      window.location.href = 'dashboard.html';
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  },

  initNavbar() {
    const userContainer = document.getElementById('navbarUserSection');
    if (!userContainer) return;

    if (this.isLoggedIn()) {
      const user = this.getUser();
      const roleName = user.role ? user.role.replace(/_/g, ' ') : 'User';
      userContainer.innerHTML = `
        <div class="dropdown">
          <button class="btn btn-outline-light dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown">
            <i class="bi bi-person-circle"></i>
            <span class="d-none d-md-inline">${user.fullName || user.email}</span>
            <span class="badge bg-danger ms-1 text-uppercase" style="font-size: 0.65rem;">${roleName}</span>
          </button>
          <ul class="dropdown-menu dropdown-menu-end shadow">
            <li><h6 class="dropdown-header">${user.designation || user.email}</h6></li>
            <li><a class="dropdown-item" href="dashboard.html"><i class="bi bi-speedometer2 me-2"></i>Dashboard</a></li>
            <li><a class="dropdown-item" href="notifications.html"><i class="bi bi-bell me-2"></i>Notifications</a></li>
            <li><hr class="dropdown-divider"></li>
            <li><button class="dropdown-item text-danger" onclick="auth.logout()"><i class="bi bi-box-arrow-right me-2"></i>Sign Out</button></li>
          </ul>
        </div>
      `;
    } else {
      userContainer.innerHTML = `
        <a href="login.html" class="btn btn-outline-light btn-sm me-2"><i class="bi bi-box-arrow-in-right me-1"></i>Sign In</a>
        <a href="funding-campaigns.html" class="btn btn-danger btn-sm"><i class="bi bi-heart-pulse me-1"></i>Support Logistics</a>
      `;
    }
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  auth.initNavbar();
});
