/**
 * VPOS Contact Information Configuration
 * 
 * Centralized contact details for all legal documents and pages.
 * Update this file to change contact information across all pages.
 * 
 * Author: Value Tech Solutions
 * Last Updated: June 2026
 */

const VPOS_CONTACT = {
  // Company Information
  company: {
    name: "Value Tech Solutions",
    product: "VPOS",
    fullName: "VPOS - Value Tech Solutions"
  },

  // Support Contact
  support: {
    email: "support@vposindia.com",
    phone: "+919019069884",
    phoneDisplay: "090190 69884",
    hours: "Monday – Saturday, 9:00 AM – 6:00 PM IST"
  },

  // Business Address
  address: {
    street: "4th Floor, RJ Complex, SH 35, Varthur – Sarjapur Rd",
    area: "Yamare Village, Sompura",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "562125",
    country: "India",
    full: "4th Floor, RJ Complex, SH 35, Varthur – Sarjapur Rd, Yamare Village, Sompura, Bengaluru, Karnataka 562125, India",
    formatted: "4th Floor, RJ Complex, SH 35, Varthur – Sarjapur Rd,<br/>Yamare Village, Sompura, Bengaluru, Karnataka 562125"
  },

  // Legal & Compliance
  legal: {
    effectiveDate: "June 1, 2026",
    lastUpdated: "June 1, 2026",
    jurisdiction: "Karnataka, India"
  },

  // Website & URLs
  urls: {
    website: "https://vposindia.com",
    docs: "https://posvtech-coder.github.io/vpos-docs",
    privacyPolicy: "https://posvtech-coder.github.io/vpos-docs/legal/privacy-policy.html",
    termsAndConditions: "https://posvtech-coder.github.io/vpos-docs/legal/terms-and-conditions.html",
    deleteAccount: "https://posvtech-coder.github.io/vpos-docs/legal/delete-account.html",
    support: "https://posvtech-coder.github.io/vpos-docs/support.html"
  },

  // Email Templates
  emailTemplates: {
    accountDeletion: {
      to: "support@vposindia.com",
      subject: "VPOS Admin Account Deletion Request"
    },
    generalSupport: {
      to: "support@vposindia.com",
      subject: "VPOS Support Request"
    }
  }
};

/**
 * Helper function to create mailto link
 * @param {string} email - Email address
 * @param {string} subject - Email subject (optional)
 * @returns {string} Mailto URL
 */
function createMailtoLink(email, subject = "") {
  const subjectParam = subject ? `?subject=${encodeURIComponent(subject)}` : "";
  return `mailto:${email}${subjectParam}`;
}

/**
 * Helper function to create tel link
 * @param {string} phone - Phone number with country code
 * @returns {string} Tel URL
 */
function createTelLink(phone) {
  return `tel:${phone}`;
}

/**
 * Populate contact information in HTML elements
 * Call this function after DOM is loaded
 */
function populateContactInfo() {
  // Email elements
  document.querySelectorAll('[data-contact="email"]').forEach(el => {
    el.textContent = VPOS_CONTACT.support.email;
    if (el.tagName === 'A') {
      el.href = createMailtoLink(VPOS_CONTACT.support.email);
    }
  });

  // Email with subject
  document.querySelectorAll('[data-contact="email-delete-account"]').forEach(el => {
    el.textContent = VPOS_CONTACT.support.email;
    if (el.tagName === 'A') {
      el.href = createMailtoLink(
        VPOS_CONTACT.support.email,
        VPOS_CONTACT.emailTemplates.accountDeletion.subject
      );
    }
  });

  // Phone elements
  document.querySelectorAll('[data-contact="phone"]').forEach(el => {
    el.textContent = VPOS_CONTACT.support.phoneDisplay;
    if (el.tagName === 'A') {
      el.href = createTelLink(VPOS_CONTACT.support.phone);
    }
  });

  // Support hours
  document.querySelectorAll('[data-contact="hours"]').forEach(el => {
    el.textContent = VPOS_CONTACT.support.hours;
  });

  // Company name
  document.querySelectorAll('[data-contact="company"]').forEach(el => {
    el.textContent = VPOS_CONTACT.company.name;
  });

  // Address
  document.querySelectorAll('[data-contact="address"]').forEach(el => {
    el.textContent = VPOS_CONTACT.address.full;
  });

  // Effective date
  document.querySelectorAll('[data-contact="effective-date"]').forEach(el => {
    el.textContent = VPOS_CONTACT.legal.effectiveDate;
  });

  // Last updated
  document.querySelectorAll('[data-contact="last-updated"]').forEach(el => {
    el.textContent = VPOS_CONTACT.legal.lastUpdated;
  });
}

// Auto-populate on DOM load
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateContactInfo);
  } else {
    populateContactInfo();
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VPOS_CONTACT, createMailtoLink, createTelLink, populateContactInfo };
}
