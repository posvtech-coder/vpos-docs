# Google Play Data Safety - Quick Reference

## 📋 URLs for Data Safety Form

### Account Deletion URL
```
https://posvtech-coder.github.io/vpos-docs/legal/delete-account.html
```

### Privacy Policy URL
```
https://posvtech-coder.github.io/vpos-docs/legal/privacy-policy.html
```

### Support/Contact URL
```
https://posvtech-coder.github.io/vpos-docs/support.html
```

---

## ✅ How to Update Contact Information

**All contact information is centralized in ONE file:**

📁 **`vpos-legal/js/contact-config.js`**

### To Update Email:
```javascript
support: {
  email: "newsupport@vposindia.com",  // ← Change here
  // ...
}
```

### To Update Phone:
```javascript
support: {
  // ...
  phone: "+919876543210",           // ← Change here
  phoneDisplay: "098765 43210",      // ← And here
  // ...
}
```

### To Update Address:
```javascript
address: {
  street: "New Address Line 1",
  area: "New Area",
  city: "New City",
  // ...
}
```

**That's it!** All pages (delete-account.html, support.html, etc.) will automatically show the updated information.

---

## 🔄 Centralized System Benefits

✅ **Update once, change everywhere** - No need to edit multiple HTML files  
✅ **Zero typos** - Single source of truth  
✅ **Fast updates** - Change email/phone in 30 seconds  
✅ **Consistency guaranteed** - All pages show same info  
✅ **Easy to maintain** - One file to manage  

---

## 📞 Current Contact Information

**Email:** support@vposindia.com  
**Phone:** +91 90190 69884 (090190 69884)  
**Hours:** Monday – Saturday, 9:00 AM – 6:00 PM IST

**Address:**  
Value Tech Solutions  
4th Floor, RJ Complex, SH 35, Varthur – Sarjapur Rd  
Yamare Village, Sompura  
Bengaluru, Karnataka 562125  
India

---

## 📄 Pages Using Centralized Config

✅ **delete-account.html** - Account deletion instructions  
✅ **support.html** - Customer support page  
⏳ **privacy-policy.html** - To be migrated  
⏳ **terms-and-conditions.html** - To be migrated  

---

**See CONTACT_CONFIG_README.md for full documentation**
