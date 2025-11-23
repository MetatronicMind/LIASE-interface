# Settings Tab - Quick Access Guide

## 🎯 Quick Access

### Settings Location
```
Dashboard → Settings (in left sidebar)
```

### Tab Overview

```
┌─────────────────────────────────────────────────────────┐
│  Settings                                                │
│  Manage system configuration, roles, and organization   │
├─────────────────────────────────────────────────────────┤
│ [🛡️ Role Management] [🏢 Organization] [🔔 Notifications] │
│ [📧 Email Settings] [⚙️ Admin Configuration]            │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [Tab Content Area]                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## 🛡️ Tab 1: Role Management

**What you can do:**
- ✅ View all user roles
- ✅ See role permissions
- ✅ Create new custom roles
- ✅ Edit role permissions
- ✅ Delete custom roles

**Quick Actions:**
```
1. Click "Manage Roles" button
2. Navigate to full role management page
3. Create/edit/delete roles
```

**Requires:** `roles.read` permission

---

## 🏢 Tab 2: Organization Management

**What you can do:**
- ✅ View organization details
- ✅ Edit organization name
- ✅ Update contact information
- ✅ Modify organization address
- ✅ View user count

**Quick Actions:**
```
1. Click "Edit Organization" button
2. Update organization details
3. Click "Save Changes"
```

**Requires:** `organizations.read` permission

---

## 🔔 Tab 3: Notifications

**What you can do:**
- ✅ View all notifications
- ✅ Filter by status (all/pending/sent/failed)
- ✅ See notification statistics
- ✅ View notification details

**Stats Dashboard:**
```
┌────────┬────────┬─────────┬────────┐
│ Total  │  Sent  │ Pending │ Failed │
│   50   │   42   │    5    │   3    │
└────────┴────────┴─────────┴────────┘
```

**Filter Options:**
- All
- Pending
- Sent
- Failed

**Requires:** `notifications.read` permission

---

## 📧 Tab 4: Email Settings

**What you can do:**
- ✅ View email templates
- ✅ Check email logs
- ✅ See SMTP configuration
- ✅ Track email delivery status

**Sub-sections:**
1. **Templates** - View all email templates
2. **Email Logs** - Recent email delivery history
3. **SMTP Config** - Email server settings

**Quick Actions:**
```
Templates → View template details
Logs      → Check delivery status
SMTP      → View server configuration
```

**Requires:** `email.read` permission

---

## ⚙️ Tab 5: Admin Configuration

**What you can do:**
- ✅ Manage scheduled jobs
- ✅ View system configuration
- ✅ Start/pause jobs
- ✅ Trigger jobs manually

**Sub-sections:**
1. **Scheduled Jobs** - Automated tasks management
2. **System Configs** - System settings

**Job Actions:**
```
▶️ Play   - Activate job
⏸️ Pause  - Deactivate job
▶️ Trigger - Run job now
```

**Requires:** 
- `admin_config.read` permission
- **Admin role** (not just permissions)

---

## 🔐 Permission Requirements

| Tab | View | Edit | Delete |
|-----|------|------|--------|
| Roles | `roles.read` | `roles.write` | `roles.delete` |
| Organization | `organizations.read` | `organizations.write` | - |
| Notifications | `notifications.read` | `notifications.write` | `notifications.delete` |
| Email | `email.read` | `email.write` | `email.delete` |
| Admin Config | `admin_config.read` | `admin_config.write` | - |

---

## 🚀 Getting Started

### Step 1: Login as Admin
```
1. Go to login page
2. Use admin credentials
3. You will be redirected to dashboard
```

### Step 2: Navigate to Settings
```
1. Look at left sidebar
2. Find "Settings" (gear icon ⚙️)
3. Click to open Settings page
```

### Step 3: Select a Tab
```
1. Choose the tab you need
2. Tab content will load automatically
3. Perform desired actions
```

---

## 📱 Mobile Access

Settings page is fully responsive:
- ✅ Tabs scroll horizontally on mobile
- ✅ Content adapts to screen size
- ✅ All features accessible on mobile

---

## ❓ Common Questions

### Q: I don't see the Settings tab?
**A:** You need `settings.read` permission. Contact your admin.

### Q: Settings page shows "no permissions"?
**A:** You need at least one module permission (roles, organizations, etc.)

### Q: I can't see Admin Configuration tab?
**A:** This tab requires admin role, not just permissions.

### Q: How do I create a new role?
**A:** 
1. Go to Role Management tab
2. Click "Manage Roles"
3. Click "Create New Role"
4. Fill in role details

### Q: How do I edit organization details?
**A:**
1. Go to Organization tab
2. Click "Edit Organization"
3. Update details
4. Click "Save Changes"

---

## 🎨 Visual Guide

### Settings Navigation
```
Dashboard
    ├── Drug Management
    ├── Triage
    ├── QC Triage
    ├── Data Entry
    ├── Medical Reviewer
    ├── Full Report
    ├── Reports
    ├── Audit Trail
    ├── User Management
    └── ⚙️ Settings ← YOU ARE HERE
           ├── 🛡️ Role Management
           ├── 🏢 Organization
           ├── 🔔 Notifications
           ├── 📧 Email Settings
           └── ⚙️ Admin Configuration
```

### Tab Icons
- 🛡️ **Role Management** - Shield icon
- 🏢 **Organization** - Building icon
- 🔔 **Notifications** - Bell icon
- 📧 **Email Settings** - Envelope icon
- ⚙️ **Admin Configuration** - Gear icon

---

## 📞 Support

For issues or questions:
1. Check permission requirements above
2. Contact your system administrator
3. Refer to main documentation: `SETTINGS-TAB-IMPLEMENTATION.md`

---

**Quick Tip:** Bookmark this page for quick reference! 🔖
