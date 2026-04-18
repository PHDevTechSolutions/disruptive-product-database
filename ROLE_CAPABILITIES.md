# Role Capabilities and Permissions Matrix

> **Version:** 2.0.0-Espiron  
> **Last Updated:** April 18, 2026  
> **Purpose:** Comprehensive access control documentation and AI support bot training reference

---

## Table of Contents

1. [Document Purpose](#1-document-purpose)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Department Structure and Roles](#3-department-structure-and-roles)
4. [Permission Matrix by Role](#4-permission-matrix-by-role)
5. [Feature Visibility Guide](#5-feature-visibility-guide)
6. [Troubleshooting Access Issues](#6-troubleshooting-access-issues)
7. [Quick Reference Tables](#7-quick-reference-tables)

---

## 1. Document Purpose

This document serves as the authoritative reference for role-based access control within the Espiron system. It provides comprehensive mapping of user roles, departments, permissions, visible features, and restricted functionalities. This documentation is specifically structured to support AI-powered support bots in accurately answering user questions about system capabilities, access rights, and feature availability based on user roles.

**Intended Use Cases:**
- AI support bot training and knowledge base
- User access verification and troubleshooting
- Permission audit and compliance documentation
- New user onboarding role clarification
- Feature accessibility inquiries

---

## 2. System Architecture Overview

### Role-Based Access Control Model

Espiron implements a hierarchical Role-Based Access Control (RBAC) system with the following architectural principles:

**Role Hierarchy:**
- Super Administrator (highest privilege level)
- Administrator
- Department Manager
- Standard User (with role-specific variations)
- Read-Only User (lowest privilege level)

**Permission Types:**
- Create (C): Ability to create new records
- Read (R): Ability to view records and data
- Update (U): Ability to modify existing records
- Delete (D): Ability to remove or deactivate records
- Approve (A): Ability to approve workflow requests
- Export (E): Ability to export data
- Import (I): Ability to import bulk data
- Configure (Cfg): Ability to change system settings

**Access Control Enforcement Points:**
- Route-level guards (page access control)
- Component-level guards (feature visibility)
- API-level authorization (data operation control)
- Database-level security rules (data access control)

---

## 3. Department Structure and Roles

### 3.1 System Administration Department

#### 3.1.1 Super Administrator Role
**Role Identifier:** `role:super_admin`  
**Department:** System Administration  
**Hierarchy Level:** 1 (Highest)

**Role Description:**
Super Administrators possess unrestricted access to all system functions, configurations, and data. This role is reserved for system owners and senior technical personnel responsible for platform integrity, security, and global configuration.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✓ | ✓ | ✓ | ✓ (Hard Delete) | ✓ | ✓ | ✓ | ✓ |
| Suppliers | ✓ | ✓ | ✓ | ✓ (Hard Delete) | ✓ | ✓ | ✓ | ✓ |
| SPF Requests | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Users | ✓ | ✓ | ✓ | ✓ | N/A | ✓ | ✓ | ✓ |
| API Keys | ✓ | ✓ | ✓ | ✓ | N/A | ✓ | N/A | ✓ |
| Roles & Permissions | ✓ | ✓ | ✓ | ✓ | N/A | ✓ | N/A | ✓ |
| System Settings | ✓ | ✓ | ✓ | ✓ | N/A | ✓ | N/A | ✓ |
| Audit Logs | N/A | ✓ | N/A | N/A | N/A | ✓ | N/A | ✓ |
| Collaboration Hub | ✓ | ✓ | ✓ | ✓ | N/A | ✓ | N/A | ✓ |
| Dashboard | View All | Metrics | All | N/A | N/A | ✓ | N/A | ✓ |

**Visible Navigation Items:**
- Dashboard (full metrics view)
- Products (with add, edit, delete, bulk operations)
- Suppliers (with add, edit, delete, bulk operations)
- SPF Requests (all requests, all statuses)
- User Management (complete user list)
- Roles & Permissions (configuration interface)
- API Management (key generation and monitoring)
- System Settings (all configuration panels)
- Audit Logs (complete system audit trail)
- Collaboration Hub (all conversations)
- Profile Settings

**Restricted From:**
- No restrictions (full system access)

**Special Privileges:**
- Hard delete permanently removes records from database
- Can impersonate other users for troubleshooting
- Can override approval workflows
- Can modify system-wide configurations
- Can access all department data without restriction
- Can reset any user password
- Can revoke any session

---

#### 1.2 Administrator Role
**Role Identifier:** `role:admin`  
**Department:** System Administration  
**Hierarchy Level:** 2

**Role Description:**
Administrators manage day-to-day system operations, user accounts, and standard configurations. They have broad access but cannot perform destructive operations reserved for Super Administrators.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✓ | ✓ | ✓ | ✓ (Soft Delete) | ✓ | ✓ | ✓ | ✗ |
| Suppliers | ✓ | ✓ | ✓ | ✓ (Soft Delete) | ✓ | ✓ | ✓ | ✗ |
| SPF Requests | ✓ | ✓ | ✓ | ✓ (Soft Delete) | ✓ | ✓ | ✓ | ✗ |
| Users | ✓ | ✓ | ✓ | ✓ (Deactivate) | N/A | ✓ | ✓ | Partial |
| API Keys | ✓ | ✓ | ✓ | ✓ | N/A | ✓ | N/A | ✗ |
| Roles & Permissions | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | N/A | ✗ |
| System Settings | ✗ | ✓ | Partial | ✗ | N/A | ✓ | N/A | Partial |
| Audit Logs | N/A | ✓ | N/A | N/A | N/A | ✓ | N/A | ✗ |
| Collaboration Hub | ✓ | ✓ | ✓ | Own Only | N/A | ✓ | N/A | ✗ |
| Dashboard | View All | Metrics | All | N/A | N/A | ✓ | N/A | Partial |

**Visible Navigation Items:**
- Dashboard (full metrics view)
- Products (full management)
- Suppliers (full management)
- SPF Requests (all requests)
- User Management (create, edit, deactivate users)
- API Management (generate and revoke keys)
- System Settings (partial - non-critical settings)
- Audit Logs (view only)
- Collaboration Hub
- Profile Settings

**Hidden/Restricted Items:**
- Role permission modification (view only)
- Critical system configuration changes
n- Hard delete functionality (soft delete only)
- Super admin audit logs

**Special Privileges:**
- Can approve any SPF request regardless of value
- Can deactivate user accounts
- Can reset user passwords (with notification)
- Can view all department data
- Can export all system data

---

### 2. PRODUCT MANAGEMENT DEPARTMENT

#### 2.1 Product Manager Role
**Role Identifier:** `role:product_manager`  
**Department:** Product Management  
**Hierarchy Level:** 3

**Role Description:**
Product Managers maintain the product catalog, ensuring accurate, complete, and current product information. They have full control over product data but limited access to system administration functions.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✓ | ✓ | ✓ | ✓ (Soft Delete) | N/A | ✓ | ✓ | ✗ |
| Suppliers | ✓ | ✓ | ✓ | ✗ | N/A | ✓ | ✓ | ✗ |
| SPF Requests | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Users | ✗ | Own Only | Own Only | ✗ | N/A | ✗ | ✗ | ✗ |
| API Keys | ✗ | Own Only | ✗ | ✗ | N/A | ✗ | ✗ | ✗ |
| Roles & Permissions | ✗ | ✗ | ✗ | ✗ | N/A | ✗ | ✗ | ✗ |
| System Settings | ✗ | ✗ | ✗ | ✗ | N/A | ✗ | ✗ | ✗ |
| Audit Logs | N/A | Own Actions | N/A | N/A | N/A | ✓ | N/A | ✗ |
| Collaboration Hub | ✓ | ✓ | Own Only | Own Only | N/A | ✓ | N/A | ✗ |
| Dashboard | Product | Metrics | Personal | N/A | N/A | ✓ | N/A | ✗ |

**Visible Navigation Items:**
- Dashboard (product-focused metrics)
- Products (full product management)
- Suppliers (view and limited edit)
- SPF Requests (create and view own requests)
- Collaboration Hub
- Profile Settings
- Help & Documentation

**Hidden/Restricted Items:**
- User Management (other users)
- API Management (admin functions)
- System Settings
- Audit Logs (others' actions)
- Supplier deletion
- SPF approval functions
- Role configuration

**Special Privileges:**
- Can create and edit all product records
- Can bulk import and export products
- Can generate Technical Data Sheets (TDS)
- Can view product change history
- Can manage product images and attachments
- Can add new suppliers (but not delete)
- Can initiate SPF requests

**Workflow Participation:**
- Can create SPF requests for pricing changes
- Receives notifications on product approvals
- Can comment on product-related discussions
- Can view supplier information for sourcing decisions

---

#### 2.2 Product Coordinator Role
**Role Identifier:** `role:product_coordinator`  
**Department:** Product Management  
**Hierarchy Level:** 4

**Role Description:**
Product Coordinators assist in maintaining product data quality and completeness. They have read access to all product information and limited editing capabilities for non-critical fields.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✗ | ✓ | Partial | ✗ | N/A | ✓ | ✗ | ✗ |
| Suppliers | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| SPF Requests | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Users | ✗ | Own Only | Own Only | ✗ | N/A | ✗ | ✗ | ✗ |
| Collaboration Hub | ✓ | ✓ | Own Only | Own Only | N/A | ✓ | N/A | ✗ |
| Dashboard | Product | Metrics | Personal | N/A | N/A | ✓ | N/A | ✗ |

**Visible Navigation Items:**
- Dashboard (product metrics)
- Products (view all, edit limited fields)
- Suppliers (view only)
- SPF Requests (view only)
- Collaboration Hub
- Profile Settings

**Hidden/Restricted Items:**
- Product creation
- Product deletion
- Supplier editing
- SPF request creation
- Bulk import functions
- System administration features

**Editable Product Fields:**
- Product descriptions
- Technical specifications (existing)
- Image captions
- Category assignments (with approval)
- Tags and metadata

**Non-Editable Product Fields:**
- Product names
- Supplier associations
- Pricing information
- SKU and internal codes
- Critical specifications

---

### 3. PROCUREMENT DEPARTMENT

#### 3.1 Procurement Manager Role
**Role Identifier:** `role:procurement_manager`  
**Department:** Procurement  
**Hierarchy Level:** 3

**Role Description:**
Procurement Managers oversee supplier relationships and manage the commercial aspects of vendor engagements. They have comprehensive access to supplier data and participate in special pricing workflows.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| Suppliers | ✓ | ✓ | ✓ | ✓ (Soft Delete) | N/A | ✓ | ✓ | ✗ |
| SPF Requests | ✓ | ✓ | ✓ | ✗ | ✓ (Dept) | ✓ | ✗ | ✗ |
| Users | ✗ | Own Only | Own Only | ✗ | N/A | ✗ | ✗ | ✗ |
| Collaboration Hub | ✓ | ✓ | ✓ | Own Only | N/A | ✓ | N/A | ✗ |
| Dashboard | Supplier/SPF | Metrics | Personal | N/A | N/A | ✓ | N/A | ✗ |

**Visible Navigation Items:**
- Dashboard (supplier and SPF metrics)
- Products (view only)
- Suppliers (full management)
- SPF Requests (full participation)
- Collaboration Hub
- Profile Settings

**Special Privileges:**
- Can approve SPF requests within department authority limits
- Can create and manage supplier records
- Can initiate SPF requests for procurement purposes
- Can view all supplier-product relationships
- Can export supplier data for analysis
- Can bulk import supplier information

**SPF Approval Authority:**
- Can approve SPF requests up to configured limit (e.g., $50,000)
- Can reject any SPF request
- Can request additional information on SPF submissions
- Receives notifications for pending approvals

---

#### 3.2 Procurement Specialist Role
**Role Identifier:** `role:procurement_specialist`  
**Department:** Procurement  
**Hierarchy Level:** 4

**Role Description:**
Procurement Specialists support supplier management activities and assist in SPF request preparation. They have read access to supplier data and limited editing capabilities.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| Suppliers | ✗ | ✓ | Partial | ✗ | N/A | ✓ | ✗ | ✗ |
| SPF Requests | ✓ | ✓ | Own Only | ✗ | ✗ | ✓ | ✗ | ✗ |
| Users | ✗ | Own Only | Own Only | ✗ | N/A | ✗ | ✗ | ✗ |
| Collaboration Hub | ✓ | ✓ | Own Only | Own Only | N/A | ✓ | N/A | ✗ |
| Dashboard | Supplier/SPF | Metrics | Personal | N/A | N/A | ✓ | N/A | ✗ |

**Visible Navigation Items:**
- Dashboard (supplier and SPF metrics)
- Products (view only)
- Suppliers (view and limited edit)
- SPF Requests (create and view own)
- Collaboration Hub
- Profile Settings

**Editable Supplier Fields:**
- Contact information
- Notes and comments
- Relationship status updates
- Performance indicators

**SPF Request Participation:**
- Can create SPF requests
- Can edit own draft requests
- Cannot approve requests
- Can view request status

---

### 4. SALES DEPARTMENT

#### 4.1 Sales Manager Role
**Role Identifier:** `role:sales_manager`  
**Department:** Sales  
**Hierarchy Level:** 3

**Role Description:**
Sales Managers oversee sales operations and have comprehensive read access to product and pricing information. They participate in special pricing workflows with approval authority.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| Suppliers | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| SPF Requests | ✓ | ✓ | ✓ | ✗ | ✓ (Dept) | ✓ | ✗ | ✗ |
| Users | ✗ | Own Only | Own Only | ✗ | N/A | ✗ | ✗ | ✗ |
| Collaboration Hub | ✓ | ✓ | ✓ | Own Only | N/A | ✓ | N/A | ✗ |
| Dashboard | Sales | Metrics | Personal | N/A | N/A | ✓ | N/A | ✗ |

**Visible Navigation Items:**
- Dashboard (sales metrics and SPF counts)
- Products (view and generate TDS)
- Suppliers (view only)
- SPF Requests (full participation)
- Collaboration Hub
- Profile Settings

**Special Privileges:**
- Can approve SPF requests within department authority limits
- Can generate Technical Data Sheets for customer presentations
- Can view all product information including specifications
- Can export product data for proposals
- Can initiate SPF requests for customer deals

**SPF Approval Authority:**
- Can approve SPF requests within configured value limits
- Can escalate requests beyond authority to higher management
- Can negotiate terms within approved parameters

---

#### 4.2 Sales Representative Role
**Role Identifier:** `role:sales_representative`  
**Department:** Sales  
**Hierarchy Level:** 4

**Role Description:**
Sales Representatives are the primary users of product information for customer-facing activities. They have read access to products and can generate customer documentation.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| Suppliers | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| SPF Requests | ✓ | ✓ | Own Only | ✗ | ✗ | ✓ | ✗ | ✗ |
| Users | ✗ | Own Only | Own Only | ✗ | N/A | ✗ | ✗ | ✗ |
| Collaboration Hub | ✓ | ✓ | Own Only | Own Only | N/A | ✓ | N/A | ✗ |
| Dashboard | Sales | Metrics | Personal | N/A | N/A | ✓ | N/A | ✗ |

**Visible Navigation Items:**
- Dashboard (personal sales metrics)
- Products (view and generate TDS)
- Suppliers (view only - limited info)
- SPF Requests (create and view own)
- Collaboration Hub
- Profile Settings

**Special Privileges:**
- Can generate Technical Data Sheets (TDS) as PDF
- Can download product images for presentations
- Can create SPF requests for customer opportunities
- Can view product availability and specifications

**Supplier Information Access:**
- Can view supplier brand names
- Can view basic supplier contact info
- Cannot view pricing agreements
- Cannot view supplier performance data

---

### 5. EXECUTIVE/MANAGEMENT DEPARTMENT

#### 5.1 Executive Role
**Role Identifier:** `role:executive`  
**Department:** Executive  
**Hierarchy Level:** 2

**Role Description:**
Executives have oversight access to all system data for strategic decision-making. They can approve high-value SPF requests and view comprehensive analytics.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| Suppliers | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| SPF Requests | ✗ | ✓ | ✗ | ✗ | ✓ (High Value) | ✓ | ✗ | ✗ |
| Users | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| Audit Logs | N/A | ✓ | N/A | N/A | N/A | ✓ | N/A | ✗ |
| Collaboration Hub | ✓ | ✓ | Own Only | Own Only | N/A | ✓ | N/A | ✗ |
| Dashboard | Executive | Metrics | Personal | N/A | N/A | ✓ | N/A | ✗ |

**Visible Navigation Items:**
- Dashboard (executive overview with all metrics)
- Products (view and export)
- Suppliers (view and export)
- SPF Requests (all requests, approval for high-value)
- Audit Logs (high-level overview)
- Reports & Analytics
- Collaboration Hub
- Profile Settings

**SPF Approval Authority:**
- Can approve high-value SPF requests (e.g., above $50,000)
- Can override department-level approvals
- Can request additional review
- Receives escalated request notifications

---

### 6. TECHNICAL/IT DEPARTMENT

#### 6.1 IT Support Role
**Role Identifier:** `role:it_support`  
**Department:** IT Support  
**Hierarchy Level:** 3

**Role Description:**
IT Support personnel assist users with system access issues and basic troubleshooting. They have limited administrative access focused on user support functions.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✗ | ✓ | ✗ | ✗ | N/A | ✗ | ✗ | ✗ |
| Suppliers | ✗ | ✓ | ✗ | ✗ | N/A | ✗ | ✗ | ✗ |
| SPF Requests | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Users | ✗ | ✓ | Partial | ✗ | N/A | ✓ | ✗ | Partial |
| API Keys | ✗ | ✓ | ✗ | ✗ | N/A | ✗ | ✗ | ✗ |
| System Settings | ✗ | ✓ | Partial | ✗ | N/A | ✓ | N/A | Partial |
| Audit Logs | N/A | ✓ | N/A | N/A | N/A | ✓ | N/A | ✗ |
| Collaboration Hub | ✓ | ✓ | Own Only | Own Only | N/A | ✓ | N/A | ✗ |
| Dashboard | Support | Metrics | Personal | N/A | N/A | ✓ | N/A | ✗ |

**Visible Navigation Items:**
- Dashboard (support metrics)
- Products (view for troubleshooting)
- Suppliers (view for troubleshooting)
- SPF Requests (view for troubleshooting)
- User Management (password resets, basic edits)
- System Settings (user-facing settings)
- Audit Logs (view for troubleshooting)
- Collaboration Hub
- Profile Settings

**Special Privileges:**
- Can reset user passwords
- Can unlock locked accounts
- Can view user session information
- Can access system logs for troubleshooting
- Can modify user contact information
- Cannot modify role assignments
- Cannot access sensitive business data

---

### 7. READ-ONLY ROLES

#### 7.1 Auditor Role
**Role Identifier:** `role:auditor`  
**Department:** Audit/Compliance  
**Hierarchy Level:** 4

**Role Description:**
Auditors have read-only access to system data for compliance verification and audit purposes. They cannot modify any system records.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| Suppliers | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| SPF Requests | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ | ✗ | ✗ |
| Users | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | ✗ | ✗ |
| Audit Logs | N/A | ✓ | N/A | N/A | N/A | ✓ | N/A | ✗ |
| Collaboration Hub | ✗ | ✓ | ✗ | ✗ | N/A | ✓ | N/A | ✗ |
| Dashboard | Audit | Metrics | Personal | N/A | N/A | ✓ | N/A | ✗ |

**Visible Navigation Items:**
- Dashboard (audit metrics)
- Products (view and export)
- Suppliers (view and export)
- SPF Requests (view and export)
- Audit Logs (view and export)
- Reports
- Profile Settings

**Access Restrictions:**
- Cannot create, edit, or delete any records
- Cannot approve requests
- Cannot access user management functions
- Cannot view system configuration
- Cannot participate in collaboration

---

#### 7.2 Guest/Viewer Role
**Role Identifier:** `role:guest`  
**Department:** Various  
**Hierarchy Level:** 5 (Lowest)

**Role Description:**
Guest users have limited read access to public or specifically shared information. This role is for temporary access or public information viewing.

**Capabilities Matrix:**

| Feature Area | Create | Read | Update | Delete | Approve | Export | Import | Configure |
|-------------|--------|------|--------|--------|---------|--------|--------|-----------|
| Products | ✗ | Public | ✗ | ✗ | N/A | ✗ | ✗ | ✗ |
| Suppliers | ✗ | Public | ✗ | ✗ | N/A | ✗ | ✗ | ✗ |
| SPF Requests | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Users | ✗ | Own Only | Own Only | ✗ | N/A | ✗ | ✗ | ✗ |
| Collaboration Hub | ✗ | Shared | ✗ | ✗ | N/A | ✗ | N/A | ✗ |
| Dashboard | Minimal | Metrics | Personal | N/A | N/A | ✗ | N/A | ✗ |

**Visible Navigation Items:**
- Dashboard (minimal view)
- Products (public catalog only)
- Profile Settings

---

## FEATURE-BY-FEATURE ACCESS BREAKDOWN

### Dashboard Features

| Feature | Super Admin | Admin | Product Manager | Procurement | Sales | Executive | IT Support | Auditor |
|---------|-------------|-------|-----------------|-------------|-------|-----------|------------|---------|
| View All Metrics | ✓ | ✓ | Products | Suppliers | Sales | All | Support | All |
| Customize Wallpaper | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Product Count | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Supplier Count | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View SPF Count | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View User Count | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Click to Navigate | ✓ | ✓ | Products | Suppliers | Products | All | All | All |

### Product Management Features

| Feature | Super Admin | Admin | Product Manager | Procurement | Sales | Executive | IT Support | Auditor |
|---------|-------------|-------|-----------------|-------------|-------|-----------|------------|---------|
| View Product List | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Search Products | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Filter Products | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Add New Product | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Edit Product | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Delete Product (Soft) | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Hard Delete Product | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Upload Product Images | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manage Specifications | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Bulk Upload Products | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Export Products | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| Generate TDS | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| View Product History | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✓ |
| Card Size Adjustment | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### Supplier Management Features

| Feature | Super Admin | Admin | Product Manager | Procurement | Sales | Executive | IT Support | Auditor |
|---------|-------------|-------|-----------------|-------------|-------|-----------|------------|---------|
| View Supplier List | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Search Suppliers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Filter Suppliers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Add Supplier | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Edit Supplier | ✓ | ✓ | Limited | ✓ | ✗ | ✗ | ✗ | ✗ |
| Delete Supplier (Soft) | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Hard Delete Supplier | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View Supplier Products | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Bulk Upload Suppliers | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ |
| Export Suppliers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| View Supplier Details | ✓ | ✓ | ✓ | ✓ | Limited | ✓ | ✓ | ✓ |
| Manage Contact Info | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ |

### SPF Request System Features

| Feature | Super Admin | Admin | Product Manager | Procurement | Sales | Executive | IT Support | Auditor |
|---------|-------------|-------|-----------------|-------------|-------|-----------|------------|---------|
| View All Requests | ✓ | ✓ | Own | Own | Own | All | All | All |
| Create Request | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit Own Request | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |
| Edit Others' Requests | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Approve Requests | ✓ | ✓ | ✗ | ✓ (Dept) | ✓ (Dept) | ✓ (High) | ✗ | ✗ |
| Reject Requests | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Request More Info | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✗ | ✗ |
| View Version History | ✓ | ✓ | Own | Own | Own | All | ✗ | All |
| Export Request Data | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ |
| View Timer/Escalation | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Comment on Requests | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Attach Documents | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ |

### User Management Features

| Feature | Super Admin | Admin | Product Manager | Procurement | Sales | Executive | IT Support | Auditor |
|---------|-------------|-------|-----------------|-------------|-------|-----------|------------|---------|
| View User List | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Create User | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Edit User | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | Limited | ✗ |
| Deactivate User | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Reset Password | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Change Roles | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| View Own Profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Edit Own Profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Audit Trail | ✓ | ✓ | Own | Own | Own | All | ✓ | All |

### System Administration Features

| Feature | Super Admin | Admin | Product Manager | Procurement | Sales | Executive | IT Support | Auditor |
|---------|-------------|-------|-----------------|-------------|-------|-----------|------------|---------|
| System Settings | ✓ | Partial | ✗ | ✗ | ✗ | ✗ | Partial | ✗ |
| API Key Management | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Role Configuration | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Audit Log Access | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Backup/Restore | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| System Logs | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ | ✗ |
| Rate Limit Config | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Integration Settings | ✓ | Partial | ✗ | ✗ | ✗ | ✗ | Partial | ✗ |

---

## AI SUPPORT BOT KNOWLEDGE DICTIONARY

### Intent Categories for AI Support

**1. Access Verification Intents**
- `check_permission` - User asking if they can perform a specific action
- `view_visibility` - User asking if they can see specific data or features
- `role_capabilities` - User asking what their role can do
- `feature_access` - User asking about access to specific features

**2. Troubleshooting Intents**
- `missing_feature` - User cannot find a feature they expect to see
- `access_denied` - User getting permission errors
- `cannot_edit` - User unable to modify records
- `cannot_delete` - User unable to delete records

**3. Workflow Intents**
- `approval_authority` - User asking about approval permissions
- `create_request` - User asking about creating SPF requests
- `escalation_path` - User asking about escalation procedures

**4. Navigation Intents**
- `where_is_feature` - User looking for a specific functionality
- `how_to_access` - User asking navigation questions
- `role_dashboard` - User asking about dashboard differences

### Response Templates for AI Bot

**Access Denied Response:**
```
I understand you're trying to [ACTION]. Based on your role as [ROLE], this action requires [REQUIRED_PERMISSION] which is assigned to [ALLOWED_ROLES]. 

Your current permissions allow you to:
[LIST_ALLOWED_ACTIONS]

To gain this capability, you would need to:
1. Contact your system administrator
2. Request role elevation to [SUGGESTED_ROLE]
3. Or ask someone with [ALLOWED_ROLE] to perform this action

Is there something else I can help you with regarding your current access level?
```

**Feature Visibility Response:**
```
As a [ROLE], you have [ACCESS_LEVEL] access to [FEATURE].

You can:
[LIST_CAPABILITIES]

You cannot:
[LIST_RESTRICTIONS]

To access this feature, navigate to:
[NAVIGATION_PATH]
```

**Role Comparison Response:**
```
Here's the comparison between [ROLE1] and [ROLE2] for [FEATURE]:

[ROLE1]:
- Can: [CAPABILITIES]
- Cannot: [RESTRICTIONS]

[ROLE2]:
- Can: [CAPABILITIES]
- Cannot: [RESTRICTIONS]

The key difference is [KEY_DIFFERENCE].
```

### Permission Keywords Dictionary

**CRUD Operations:**
- "create" → Create permission
- "add" → Create permission
- "new" → Create permission
- "view" → Read permission
- "see" → Read permission
- "access" → Read permission
- "edit" → Update permission
- "modify" → Update permission
- "change" → Update permission
- "update" → Update permission
- "delete" → Delete permission
- "remove" → Delete permission
- "erase" → Delete permission
- "approve" → Approve permission
- "authorize" → Approve permission
- "sign off" → Approve permission
- "export" → Export permission
- "download" → Export permission
- "import" → Import permission
- "upload" → Import permission
- "configure" → Configure permission
- "settings" → Configure permission

**Role Keywords:**
- "super admin" → role:super_admin
- "administrator" → role:admin
- "admin" → role:admin
- "product manager" → role:product_manager
- "procurement manager" → role:procurement_manager
- "sales manager" → role:sales_manager
- "sales rep" → role:sales_representative
- "executive" → role:executive
- "it support" → role:it_support
- "auditor" → role:auditor

**Feature Keywords:**
- "products" → Product Management module
- "suppliers" → Supplier Management module
- "spf" → SPF Request System
- "special price" → SPF Request System
- "users" → User Management
- "dashboard" → Dashboard module
- "settings" → System Settings
- "api" → API Management
- "reports" → Reports and Analytics
- "audit" → Audit Logs

### Common User Questions and Answers

**Q: Why can't I delete products?**
A: Product deletion requires the Delete permission on the Products module. Based on your role, you may have soft delete capability (marking as inactive) or no delete capability. Only Super Administrators can hard delete (permanently remove) products. If you need to remove a product, contact your administrator or mark it as inactive if that option is available to you.

**Q: Why can't I see the User Management menu?**
A: User Management visibility requires administrative privileges. This feature is visible to Super Administrators, Administrators, Executives, IT Support, and Auditors. Standard department roles (Product Manager, Procurement, Sales) do not have access to user management functions for security reasons.

**Q: Why can't I approve SPF requests?**
A: SPF approval authority is granted based on role hierarchy and department. Managers and above typically have approval authority within their value limits. If you're a Specialist or Representative level user, you can create requests but cannot approve them. Your requests will route to your department manager for approval.

**Q: Why can't I edit this supplier?**
A: Supplier editing permissions vary by role. Procurement roles have full supplier editing capabilities. Product Managers can edit limited supplier information. Sales roles have read-only access to supplier data. If you need to modify supplier information, contact someone in your Procurement department or request appropriate role assignment.

**Q: I generated a TDS but my colleague can't see it - why?**
A: Technical Data Sheets (TDS) are generated as downloadable files, not system records. When you generate a TDS, it downloads to your device. To share with colleagues, you need to distribute the file through email or file sharing. The system does not store generated TDS documents for other users to access.

**Q: Can I see products from other departments?**
A: Yes, product visibility is not restricted by department. All authenticated users can view the complete product catalog. However, editing capabilities are role-dependent. Product Managers can edit all products, while other roles have read-only or limited access.

**Q: Why is the delete button missing?**
A: If you expect to see a delete option but it's not visible, this indicates you don't have Delete permission for that record type. The system hides unavailable actions rather than showing disabled buttons. Check your role permissions or contact your administrator if you believe you should have delete access.

**Q: Can I change my role?**
A: Users cannot self-modify their role assignments. Role changes must be performed by an Administrator or Super Administrator. Contact your system administrator with a justification for the role change request. Role assignments are based on job responsibilities and security requirements.

---

## ACCESS TROUBLESHOOTING GUIDE

### Symptom: Cannot Access Page

**Diagnostic Steps:**
1. Verify user is authenticated (check session status)
2. Check user's assigned role in user management
3. Verify route-level AccessGuard permissions
4. Check for role-specific route restrictions
5. Verify user account is active (not deactivated)

**Common Causes:**
- User role does not have route permission
- User account is deactivated
- Session has expired
- URL is malformed or incorrect

### Symptom: Feature Not Visible

**Diagnostic Steps:**
1. Check component-level visibility conditions
2. Verify user's role has required permission
3. Check if feature requires additional configuration
4. Verify user is in correct department context

**Common Causes:**
- Permission not granted for role
- Feature is hidden based on role
- Feature requires elevated privileges
- UI conditional rendering excluding role

### Symptom: Cannot Perform Action

**Diagnostic Steps:**
1. Check specific action permission for role
2. Verify record ownership (own vs others)
3. Check workflow state permissions
4. Verify department-level restrictions

**Common Causes:**
- Role lacks specific CRUD permission
- Attempting to edit others' records without authority
- Workflow state prevents action
- Department boundary restriction

### Symptom: Approval Authority Issues

**Diagnostic Steps:**
1. Check role's approval value limits
2. Verify request value against authority matrix
3. Check escalation path configuration
4. Verify department alignment

**Common Causes:**
- Request value exceeds role's approval limit
- Role not configured as approver for request type
- Escalation required for high-value requests
- Cross-department approval not authorized

---

## 7. Quick Reference Tables

### 7.1 Document Version Control

**Version:** 2.0.0-Espiron  
**Created:** April 16, 2026  
**Last Updated:** April 17, 2026  
**Author:** Aaron E  
**System:** Espiron  
**Purpose:** AI Support Bot Training and Role Documentation

**Change History:**
- v2.0.0 (2026-04-17): Restructured with comprehensive table of contents
- v1.0.0 (2026-04-16): Initial comprehensive role capabilities documentation

---

## End of Document

This documentation represents the complete role capabilities and permissions matrix for Espiron as of April 2026. All role definitions, permission mappings, and access control specifications are recorded herein for reference purposes.

**Review Schedule:**
- Quarterly review for role changes
- Immediate update for permission modifications
- Annual comprehensive audit

---

## END OF DOCUMENT

This document represents the complete role-based access control specification for the Espiron system. All permissions, capabilities, and restrictions are documented for AI training and user support purposes. For questions about this document, contact the System Administration team.
