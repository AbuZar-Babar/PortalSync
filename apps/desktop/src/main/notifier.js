const { Notification } = require('electron');

class DesktopNotifier {
  constructor() {
    this.onClickHandler = null;
  }

  setFocusCallback(cb) {
    this.onClickHandler = cb;
  }

  notify2FARequired(portalName = 'Vendor Portal', remainingSeconds = 90) {
    if (!Notification.isSupported()) return;

    const notif = new Notification({
      title: `⚠️ 2FA Required — ${portalName}`,
      body: `Action required in your open Chrome window. Complete verification within ${remainingSeconds}s.`,
      urgency: 'critical',
      silent: false,
    });

    if (this.onClickHandler) {
      notif.on('click', () => {
        this.onClickHandler('2fa');
      });
    }

    notif.show();
  }

  notifyRunCompleted(portalName = 'Vendor Portal', itemCount = 0) {
    if (!Notification.isSupported()) return;

    const notif = new Notification({
      title: `✅ Invoices Downloaded — ${portalName}`,
      body: `Successfully extracted and verified ${itemCount} invoice PDF(s) with zero duplicates.`,
      silent: false,
    });

    if (this.onClickHandler) {
      notif.on('click', () => {
        this.onClickHandler('completed');
      });
    }

    notif.show();
  }

  notifyRunFailed(portalName = 'Vendor Portal', error = 'Unknown error') {
    if (!Notification.isSupported()) return;

    const notif = new Notification({
      title: `❌ Automation Alert — ${portalName}`,
      body: `Portal run failed: ${error}`,
      silent: false,
    });

    notif.show();
  }
}

module.exports = new DesktopNotifier();
