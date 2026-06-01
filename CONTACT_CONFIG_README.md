# Centralized Contact Configuration

This system provides a single source of truth for all contact information, company details, and URLs used across VPOS legal documents and support pages.

## 📁 Files

- **`js/contact-config.js`** - Main configuration file containing all contact information
- All HTML pages include this script and use data attributes to populate content

## 🔧 How to Update Contact Information

**To update any contact information across all pages:**

1. Open `js/contact-config.js`
2. Edit the values in the `VPOS_CONTACT` object
3. Save the file
4. All pages will automatically reflect the changes

### Example: Update Support Email

```javascript
// In js/contact-config.js
const VPOS_CONTACT = {
  support: {
    email: "newsupport@vposindia.com",  // ← Change this
    phone: "+919019069884",
    phoneDisplay: "090190 69884",
    hours: "Monday – Saturday, 9:00 AM – 6:00 PM IST"
  },
  // ... rest of config
};
```

That's it! All pages using `data-contact="email"` will now show the new email.

## 📝 How to Use in HTML Pages

### 1. Include the Script

Add this in your HTML `<head>` section:

```html
<script src="js/contact-config.js"></script>
<!-- Or use relative path: -->
<script src="../js/contact-config.js"></script>
```

### 2. Use Data Attributes

Replace hardcoded contact information with data attributes:

#### Email (Simple)
```html
<!-- Before -->
<a href="mailto:support@vposindia.com">support@vposindia.com</a>

<!-- After -->
<a href="#" data-contact="email"></a>
```

#### Email (With Subject - Account Deletion)
```html
<a href="#" data-contact="email-delete-account"></a>
```

#### Phone Number
```html
<a href="#" data-contact="phone"></a>
```

#### Support Hours
```html
<span data-contact="hours"></span>
```

#### Company Name
```html
<strong data-contact="company"></strong>
```

#### Address
```html
<span data-contact="address"></span>
```

#### Effective Date
```html
<span data-contact="effective-date"></span>
```

#### Last Updated
```html
<span data-contact="last-updated"></span>
```

### 3. Auto-Population

The script automatically runs when the page loads and populates all elements with `data-contact` attributes.

## 🎯 Available Data Attributes

| Attribute | Populated With | Link Type |
|-----------|---------------|-----------|
| `data-contact="email"` | Support email address | `mailto:` |
| `data-contact="email-delete-account"` | Support email with delete subject | `mailto:` with subject |
| `data-contact="phone"` | Phone number (formatted) | `tel:` |
| `data-contact="hours"` | Support hours | Text only |
| `data-contact="company"` | Company name | Text only |
| `data-contact="address"` | Full address | Text only |
| `data-contact="effective-date"` | Legal document effective date | Text only |
| `data-contact="last-updated"` | Last updated date | Text only |

## 📦 Configuration Structure

```javascript
const VPOS_CONTACT = {
  company: {
    name: "Value Tech Solutions",
    product: "VPOS",
    fullName: "VPOS - Value Tech Solutions"
  },

  support: {
    email: "support@vposindia.com",
    phone: "+919019069884",
    phoneDisplay: "090190 69884",
    hours: "Monday – Saturday, 9:00 AM – 6:00 PM IST"
  },

  address: {
    street: "...",
    city: "...",
    state: "...",
    pincode: "...",
    country: "India",
    full: "Full address string",
    formatted: "HTML formatted address"
  },

  legal: {
    effectiveDate: "June 1, 2026",
    lastUpdated: "June 1, 2026",
    jurisdiction: "Karnataka, India"
  },

  urls: {
    website: "https://vposindia.com",
    docs: "https://posvtech-coder.github.io/vpos-docs",
    privacyPolicy: "...",
    termsAndConditions: "...",
    deleteAccount: "...",
    support: "..."
  },

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
```

## 🛠️ Helper Functions

### `createMailtoLink(email, subject)`
Creates a mailto URL with optional subject.

```javascript
const link = createMailtoLink("support@vposindia.com", "Help Request");
// Returns: "mailto:support@vposindia.com?subject=Help%20Request"
```

### `createTelLink(phone)`
Creates a tel URL for phone numbers.

```javascript
const link = createTelLink("+919019069884");
// Returns: "tel:+919019069884"
```

### `populateContactInfo()`
Manually triggers population of all data-contact elements. (Runs automatically on page load)

## 📄 Pages Using This System

- ✅ `legal/delete-account.html`
- ✅ `support.html`
- ⏳ `legal/privacy-policy.html` (to be updated)
- ⏳ `legal/terms-and-conditions.html` (to be updated)

## 🚀 Benefits

1. **Single Source of Truth** - Update once, change everywhere
2. **Consistency** - All pages use the same contact information
3. **Easy Maintenance** - No need to search through multiple files
4. **Reduced Errors** - Eliminate typos and inconsistencies
5. **Fast Updates** - Change email/phone in seconds across all pages

## 🔄 Migration Checklist

To add this system to an existing HTML page:

- [ ] Add `<script src="js/contact-config.js"></script>` to `<head>`
- [ ] Replace hardcoded email addresses with `<a href="#" data-contact="email"></a>`
- [ ] Replace hardcoded phone numbers with `<a href="#" data-contact="phone"></a>`
- [ ] Replace hardcoded company names with `<span data-contact="company"></span>`
- [ ] Replace hardcoded addresses with `<span data-contact="address"></span>`
- [ ] Test the page to ensure all contact info appears correctly

## 💡 Tips

- Always use `href="#"` for `<a>` tags with data attributes - the script will set the correct href
- For non-link text, use `<span>` or any other element with the data attribute
- The script is non-blocking and won't interfere with page load
- Works with static HTML, no server-side processing required

## 🐛 Troubleshooting

**Q: Contact information not appearing?**
- Check that the script is loaded before the closing `</body>` tag or in the `<head>`
- Verify the script path is correct relative to the HTML file
- Open browser console (F12) to check for JavaScript errors

**Q: Links not working?**
- Ensure `<a>` tags have `href="#"` attribute
- The script adds the correct href automatically

**Q: Address formatting not working?**
- For formatted addresses with line breaks, use JavaScript to set innerHTML:
  ```javascript
  document.getElementById('address').innerHTML = VPOS_CONTACT.address.formatted;
  ```

---

**Last Updated:** June 2026  
**Maintained By:** Value Tech Solutions
