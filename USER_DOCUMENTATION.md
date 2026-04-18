# User Documentation

> **Version:** 2.0.0-Espiron  
> **Last Updated:** April 18, 2026  
> **Purpose:** End-user guide and comprehensive system tutorial

---

## Table of Contents

1. System Introduction
2. Getting Started
3. Dashboard Overview
4. Product Management
5. Supplier Management
6. SPF Request System
7. User Account Management
8. Notifications and Collaboration
9. Frequently Asked Questions
10. Troubleshooting Guide

---

## SYSTEM INTRODUCTION

### Purpose of the System

Espiron represents a comprehensive enterprise-grade inventory management and product database platform specifically architected to address the complex challenges of modern product information management, supplier relationship coordination, and special pricing workflow administration within organizational environments. The system serves as the authoritative single source of truth for all product-related data, creating a centralized repository that eliminates information fragmentation across departments, systems, and geographic locations.

The primary objective of Espiron is to transform how organizations manage their product catalogs by providing a unified platform where product information, supplier relationships, and pricing workflows converge into an integrated ecosystem. This convergence enables cross-functional teams including product managers, procurement specialists, sales representatives, and system administrators to collaborate effectively while maintaining data integrity and process compliance.

The platform addresses several critical business challenges including data silos where product information exists in disconnected spreadsheets and documents, inefficient approval processes for special pricing that delay sales cycles, lack of visibility into supplier relationships and their associated products, and difficulty maintaining accurate technical specifications across evolving product lines. By centralizing these functions, Espiron creates operational efficiencies while reducing errors and improving decision-making capabilities.

### Who Should Use This System

Espiron has been designed to serve a diverse range of user roles within organizations of varying sizes and operational complexities. The system accommodates different access needs, workflow participation levels, and functional requirements across multiple departmental boundaries. Understanding which user categories interact with the system helps clarify the breadth of functionality and the collaborative nature of the platform.

**Product Managers** constitute a primary user group responsible for maintaining the accuracy, completeness, and currency of product catalog information. These users require comprehensive access to product creation interfaces, editing capabilities, deletion functions, and bulk data management tools. Product managers typically engage in activities such as onboarding new products to the catalog, updating product specifications as offerings evolve, managing product categorization schemes, ensuring product images and documentation remain current, and retiring obsolete products from active status. Their work directly impacts the quality of information available to all other system users.

**Procurement Specialists** utilize the system to maintain and analyze supplier relationships while managing the commercial aspects of vendor engagements. These users interact extensively with supplier records, maintaining contact information, relationship status, and performance indicators. Procurement specialists serve as key participants in the SPF request workflow, often initiating requests for special pricing based on volume negotiations or strategic account requirements. They require visibility into product-supplier mappings to understand sourcing options and dependencies.

**Sales Representatives** leverage the system as a knowledge base for customer-facing activities, requiring rapid access to product information, technical specifications, and pricing details. These users primarily operate in read-only capacities for product and supplier data while possessing the ability to generate technical data sheets for customer presentations and proposals. Sales representatives depend on accurate, up-to-date product information to effectively communicate value propositions and technical capabilities to prospective customers.

**System Administrators** bear responsibility for the operational health, security posture, and configuration of the Espiron platform. These users manage user account lifecycles including creation, modification, and deactivation. They configure role definitions and permission assignments that control system access across user populations. System administrators monitor system performance, manage integration configurations, oversee data backup and recovery procedures, and implement organizational policies through system configuration settings.

**Approval Authorities** participate in the governance and control aspects of the platform, particularly within the special pricing workflow. These users review SPF requests submitted by sales or procurement teams, evaluating business justifications, pricing implications, and strategic alignment before rendering approval decisions. Approval authorities require comprehensive visibility into request details, supporting documentation, and related historical precedents to make informed decisions.

### Key System Benefits

The implementation of Espiron delivers substantial operational advantages that transform how organizations manage product information and related business processes. These benefits accumulate across multiple dimensions of organizational performance including efficiency, accuracy, collaboration, compliance, and accessibility.

**Centralized Data Storage Architecture** eliminates the information silos that traditionally fragment product data across departmental boundaries. Rather than maintaining separate spreadsheets, documents, and databases in different departments, Espiron establishes a single authoritative repository where all product information converges. This centralization ensures that all users access the same current data, eliminating discrepancies that arise from version control failures in distributed document management. When product information updates occur, changes propagate immediately to all stakeholders, maintaining consistency across the organization.

**Real-Time Collaboration Capabilities** reduce communication delays and coordination overhead that traditionally impede product information management workflows. Multiple users can simultaneously view and interact with product records, supplier information, and pricing requests without creating version conflicts. Comment threads, notification systems, and activity feeds create transparent communication channels that replace email chains and status meetings. This real-time collaboration environment accelerates decision-making processes and reduces the time required to coordinate activities across team boundaries.

**Automated Workflow Processing** minimizes manual intervention requirements for routine business processes while enforcing organizational policies consistently. The SPF request workflow automatically routes submissions through appropriate approval channels based on configured business rules. Status transitions trigger notifications to relevant stakeholders without requiring manual communication. Escalation procedures activate automatically when requests exceed time thresholds, ensuring that stalled processes receive appropriate attention. This automation reduces administrative overhead while improving process compliance and response times.

**Comprehensive Audit Trails** ensure accountability and provide forensic capabilities for understanding historical changes to system data. Every modification to product records, supplier information, or pricing requests captures the user identity, timestamp, and nature of changes. Version comparison tools enable review of how data evolved over time, supporting root cause analysis when questions arise about data accuracy. These audit capabilities satisfy compliance requirements for regulated industries while providing operational insights into data change patterns.

**Mobile-Responsive Design** enables field access to product information and workflow participation from smartphones and tablets. Sales representatives can retrieve product details during customer visits. Approvers can review and act on SPF requests while traveling. Product managers can update information from remote locations. The responsive interface adapts to screen dimensions and input methods appropriate for mobile devices, maintaining functionality while optimizing the user experience for smaller screens and touch-based interactions.

---

## GETTING STARTED

### System Access Requirements

Accessing the Espiron platform requires specific technical prerequisites to ensure optimal performance, security, and user experience. Understanding these requirements helps users prepare appropriate computing environments and troubleshoot access issues when they occur.

**Browser Compatibility Specifications:**
The Espiron platform requires modern web browsers capable of supporting contemporary web standards including HTML5, CSS3, and ES6 JavaScript specifications. Officially supported browser versions include Google Chrome version ninety and above, Mozilla Firefox version ninety and above, Microsoft Edge version ninety and above, and Apple Safari version fifteen and above. These browser versions provide the necessary support for the React-based interface components, real-time data synchronization, and security features implemented throughout the application.

Users accessing the system through unsupported browsers may experience degraded functionality including layout rendering issues, interactive component failures, or security vulnerability exposure. The system implements browser detection capabilities that notify users when unsupported browsers are detected, recommending upgrades to compatible versions.

**JavaScript Requirements:**
The Espiron interface relies heavily on client-side JavaScript for dynamic content rendering, real-time updates, and interactive user interface components. Users must enable JavaScript execution in their browser settings for full system functionality. The application implements progressive enhancement techniques where basic content remains accessible without JavaScript, but interactive features require script execution.

**Network Connectivity:**
While the system implements service worker caching for offline functionality in some scenarios, reliable internet connectivity is required for most operations. The platform uses websockets for real-time collaboration features and makes periodic API requests for data synchronization. Users in environments with intermittent connectivity may experience delayed updates or temporary feature unavailability.

**Display Recommendations:**
The system is optimized for desktop viewing with minimum recommended screen resolutions of thirteen hundred pixels width for full interface visibility. Mobile and tablet devices receive adapted layouts that reorganize interface elements for smaller screens while preserving core functionality. High pixel density displays receive appropriately scaled interface elements for crisp text rendering and image display.

### Login Procedures

The Espiron authentication process has been designed to balance security requirements with user convenience, implementing industry-standard practices for web application access control while minimizing friction in the user experience.

**Standard Authentication Flow:**
When users navigate to the Espiron application URL, the system automatically redirects unauthenticated sessions to the authentication page. The login interface presents fields for email address and password entry. Users must enter the email address associated with their account registration along with their current password. Password entry is masked for shoulder-surfing protection.

The system enforces case sensitivity for password validation, requiring exact character matching including uppercase and lowercase distinctions. After credential submission, the system validates the provided information against stored records. Successful authentication establishes a session and redirects the user to their personalized dashboard interface. Failed authentication attempts display appropriate error messages without revealing whether the email address or password was incorrect, preventing account enumeration attacks.

**First-Time Access Procedures:**
New user accounts are typically created by system administrators or through automated onboarding processes. When an account is created, the system generates a welcome notification sent to the registered email address containing temporary access credentials. These temporary credentials have limited validity periods and must be used for initial access.

Upon first login with temporary credentials, the system intercepts the normal flow and requires immediate password change. The password change interface enforces organizational password policies including minimum length requirements, complexity rules, and history restrictions preventing reuse of recent passwords. Users must enter their desired new password twice for confirmation before the change takes effect. After successful password establishment, normal system access proceeds to the dashboard.

**Password Recovery Mechanisms:**
Users who cannot recall their passwords can initiate recovery through the forgot password link available on the authentication page. Clicking this link presents a password recovery request form requiring email address entry. The system validates that the provided email address exists in user records before proceeding.

Upon validation, the system generates a cryptographically secure password reset token and sends an email containing reset instructions. The email includes a unique link containing the token that directs users to the password reset interface. Reset tokens expire after twenty-four hours from generation to limit exposure window. Used or expired tokens are invalidated and cannot be reused.

The password reset interface allows users to establish new passwords subject to the same policy requirements as normal password changes. Upon successful reset, the system invalidates all existing sessions for the account, requiring re-authentication with the new credentials. Users receive confirmation emails notifying them of the password change.

### Session Management

Espiron implements sophisticated session management to maintain authenticated state during user interactions while protecting against unauthorized access through session compromise or abandonment.

**Session Establishment and Persistence:**
Upon successful authentication, the system establishes a session that maintains the user's authenticated state across page navigations and browser interactions. Session identifiers are stored in secure, httpOnly cookies that resist cross-site scripting attacks. The session contains user identification, role assignments, permission grants, and preference settings that personalize the interface and control access to functions.

Sessions persist across browser restarts, allowing users to close and reopen their browsers without requiring re-authentication. The session mechanism uses refresh token rotation where short-lived access tokens are periodically refreshed using longer-lived refresh tokens. This approach limits exposure from token compromise while maintaining user convenience.

**Automatic Session Expiration:**
Security policies implement automatic session expiration after extended periods of inactivity. The inactivity timer monitors user interactions including mouse movements, keyboard input, and touch events. When no activity is detected for the configured threshold period, the system invalidates the session and redirects to the authentication page. This automatic expiration protects against session hijacking when users leave devices unattended.

The inactivity threshold is configured by system administrators based on organizational security policies. Typical configurations range from fifteen minutes for high-security environments to several hours for more permissive settings. Warning notifications appear before session expiration, allowing users to extend their sessions if they are actively using the system but have not generated interaction events.

**Manual Session Termination:**
Users can manually terminate their sessions through the logout function accessible via the user menu in the interface header. Logout immediately invalidates the server-side session and clears client-side session storage. Users are redirected to the authentication page after logout.

Manual logout is recommended when users finish their work sessions, especially on shared or public computers. The logout function ensures that subsequent users of the same device cannot access the previous user's account or data. System administrators may also implement forced logout capabilities for security incidents or policy enforcement.

---

## DASHBOARD OVERVIEW

### Dashboard Layout

The Espiron dashboard serves as the central command center for system navigation, presenting a personalized overview that orients users to current system state and provides efficient access to primary functions. The dashboard design prioritizes information hierarchy, presenting the most relevant metrics and navigation options prominently while maintaining clean, uncluttered aesthetics.

**Interface Organization:**
The dashboard interface follows a consistent header-content structure that persists across the application. The header area displays personalized welcome messaging incorporating the user's registered name and role designation. This personalization creates immediate recognition of authenticated status and reinforces user identity within the system. The welcome area includes quick access to the user menu containing profile settings, preferences, and logout functions.

Below the header, the main content area presents a responsive grid of information panels and navigation elements. The layout adapts dynamically to viewport dimensions, reorganizing elements for optimal display across desktop monitors, tablet screens, and mobile devices. Grid breakpoints ensure that content remains readable and accessible regardless of display size.

**Navigation Integration:**
The dashboard provides multiple navigation entry points to major system modules. Primary navigation occurs through the metric cards described below, which serve as both information displays and navigation triggers. Additional navigation options appear in a persistent sidebar or slide-out menu depending on device type. The navigation structure maintains consistent organization across all system pages, ensuring that users can always orient themselves and access desired functions.

**Personalization Elements:**
Beyond the wallpaper customization described in dedicated sections, the dashboard incorporates personalization through role-based content display. Users see different metric emphasis and quick action options based on their assigned roles and typical workflow patterns. System administrators see user management shortcuts. Sales representatives see product search prominence. Product managers see quick-add buttons for content creation.

### Metrics Display

Three primary metric cards present real-time statistics about system content:

**Total Products Card** displays the current count of active products in the database. Clicking this card navigates to the complete products listing page.

**Total Suppliers Card** shows the number of active supplier records maintained in the system. Clicking this card navigates to the suppliers management page.

**SPF Requests Card** indicates pending special price form requests requiring attention. A notification badge appears when new requests require review. Clicking this card navigates to the requests management interface.

### Personalization Features

Users can customize their dashboard experience through the wallpaper customization function. The system allows background image upload with adjustable opacity settings to personalize the workspace appearance. These settings save locally to the specific device used for configuration.

---

## PRODUCT MANAGEMENT

### Viewing Products

The products page presents all active products in a responsive grid layout. Each product displays a thumbnail image when available, product name, and supplier brand information. The interface adapts automatically to screen size showing optimal card arrangements for the viewing device.

**Card Size Adjustment:**
Users can increase or decrease product card sizes using the zoom controls. This feature accommodates different viewing preferences and accessibility needs. Size preferences save automatically for future sessions.

### Searching Products

The search function filters products based on multiple criteria simultaneously. Searches match against product names, supplier brand names, category type classifications, and product type designations. Search results update in real-time as users type queries.

### Filtering Products

Advanced filtering options enable precise product identification. Available filters include category type selection, product type classification, supplier brand specification, technical specification parameters, and date range limitations. Multiple filters can be applied simultaneously to narrow results. Active filters display indicators showing currently applied constraints.

**Filter Access:**
Desktop users access filters through the sidebar panel. Mobile users access filters through the slide-out drawer activated by the filter button. Filter selections update results immediately without requiring confirmation.

### Adding New Products

Product creation follows a structured form process collecting comprehensive product information. The add product interface organizes input into logical sections for efficient data entry.

**Required Information:**
New products require at minimum a product name, supplier association, and category type classification. Additional fields enhance product records but remain optional for initial creation.

**Image Upload:**
Product images upload directly through the interface supporting common image formats including JPEG, PNG, and WebP. Images should be clear product representations for identification purposes.

**Technical Specifications:**
Detailed technical specifications can be added through the dedicated specification section. These details populate automatically generated technical data sheets.

### Editing Products

Existing product modification occurs through the edit interface accessible from product cards or detail views. The edit form pre-populates with current values allowing targeted updates. All changes are tracked with timestamp and user attribution for audit purposes.

### Deleting Products

Product removal requires confirmation to prevent accidental deletion. The delete function performs soft deletion marking products as inactive rather than permanent removal. Administrators can restore deleted products or perform hard deletion for permanent removal.

### Bulk Operations

**Upload via Excel:**
Products can be created in bulk through Excel file upload. The system accepts standardized spreadsheet formats with column mappings for product fields. Upload processing includes duplicate detection with conflict resolution options.

**Download to Excel:**
Current product listings can be exported to Excel format for external analysis or reporting. Exports respect current filter and search selections allowing targeted dataset downloads.

---

## SUPPLIER MANAGEMENT

### Supplier Records

Supplier management maintains vendor information and brand associations. Supplier records integrate with product records ensuring referential integrity throughout the system.

### Adding Suppliers

New supplier creation captures essential vendor information including brand name, contact details, address information, and relationship metadata. Supplier records enable product association during product creation.

### Supplier Filtering

The supplier list supports filtering by brand name, product association status, and creation date ranges. Filter controls match the product interface providing consistent user experience.

### Bulk Supplier Operations

Excel upload and download functions support bulk supplier management following the same patterns as product operations.

---

## SPF REQUEST SYSTEM

### Understanding SPF Requests

Special Price Form requests manage pricing exceptions and negotiated rates outside standard pricing structures. The SPF workflow ensures proper authorization and documentation of special pricing agreements.

### Creating SPF Requests

Request initiation begins from product detail views or the dedicated SPF creation interface. Required information includes product identification, requested pricing, quantity parameters, customer information, and justification reasoning.

### Request Workflow

Submitted requests progress through defined status stages. Initial submission enters pending review status. Authorized approvers receive notification of new requests. Approval actions transition requests to approved or rejected states with optional comment inclusion.

### Version History

The system maintains complete version history for all SPF requests showing modification chronology, previous values, and change attribution. Version comparison displays differences between request iterations.

### Request Timer

Aging indicators show elapsed time since request submission. Timer displays help prioritize review activities based on request urgency and waiting duration.

---

## USER ACCOUNT MANAGEMENT

### Profile Management

Users can modify personal information including contact details, password credentials, and notification preferences. Profile updates require current password confirmation for security validation.

### Role Information

User role designation determines system access permissions. Role assignments are managed by system administrators and cannot be self-modified.

---

## NOTIFICATIONS AND COLLABORATION

### Notification System

Real-time notifications alert users to relevant system events. Notification types include SPF request status changes, approval requirements, product modification alerts, and system announcements.

**Notification Access:**
Unread notifications display count badges on relevant menu items. The notifications panel shows historical messages with read status indicators.

### Collaboration Hub

Integrated collaboration features enable user communication within product and request contexts. Comments and discussions attach directly to records maintaining contextual conversation history.

---

## FREQUENTLY ASKED QUESTIONS

### Q: What browsers are supported by the system?
The system supports current versions of Chrome, Firefox, Edge, and Safari. Internet Explorer is not supported.

### Q: Can I access the system on mobile devices?
Yes, the system is fully responsive and provides complete functionality on smartphones and tablets.

### Q: How do I reset my password?
Use the forgot password link on the login page. Reset instructions will be sent to your registered email.

### Q: Why can't I see certain menu options?
Menu visibility depends on your assigned role and associated permissions. Contact your administrator if you believe you need additional access.

### Q: How do I upload multiple products at once?
Use the upload button on the products page and select your Excel file containing product data.

### Q: What image formats are supported for product photos?
The system accepts JPEG, PNG, and WebP image formats up to ten megabytes per file.

### Q: Can I recover a deleted product?
Soft-deleted products can be restored by administrators. Contact support for restoration requests.

### Q: How do I generate a technical data sheet?
Open the product detail view and select the generate TDS option to create a formatted PDF document.

### Q: What happens when I submit an SPF request?
Submitted requests enter the approval workflow. Relevant approvers receive notification to review your request.

### Q: Can I track changes made to products?
Yes, the system maintains complete audit trails showing all modifications with user attribution and timestamps.

### Q: Is my data secure in the system?
The system implements industry-standard security measures including encrypted connections, password hashing, and role-based access controls.

### Q: How do I customize my dashboard background?
Click the customize wallpaper button on the dashboard to upload a personal background image.

### Q: Can I export data for external analysis?
Yes, both product and supplier data can be downloaded in Excel format with filtering applied.

### Q: What should I do if the system is slow?
Check your internet connection first. If problems persist, try clearing browser cache or contact technical support.

### Q: How do I request a new user account?
Contact your system administrator with your information to request account creation.

---

## TROUBLESHOOTING GUIDE

### Issue: Unable to Log In
**Possible Causes:** Incorrect credentials, expired password, or account lockout.  
**Resolution Steps:** Verify caps lock is off and credentials are entered correctly. Use password recovery if password is forgotten. Wait fifteen minutes if account was locked due to failed attempts.

### Issue: Page Not Loading Properly
**Possible Causes:** Browser compatibility, cached data conflict, or network connectivity.  
**Resolution Steps:** Clear browser cache and cookies. Try accessing from an alternative browser. Verify internet connection stability.

### Issue: Upload Fails
**Possible Causes:** File size limits, format incompatibility, or network interruption.  
**Resolution Steps:** Ensure file is under size limits. Verify file format matches accepted types. Retry upload with stable connection.

### Issue: Search Returns No Results
**Possible Causes:** Overly restrictive filters, search term misspelling, or data absence.  
**Resolution Steps:** Clear active filters and retry. Check search term spelling. Verify data exists in the system.

### Issue: Notification Not Received
**Possible Causes:** Notification settings disabled or browser permission blocked.  
**Resolution Steps:** Check notification preferences in profile settings. Verify browser notification permissions for the site.

### Issue: Changes Not Saving
**Possible Causes:** Validation failures, session expiration, or network errors.  
**Resolution Steps:** Check for error messages indicating required fields. Re-authenticate if session expired. Retry with stable connection.

---

## End of Document

This documentation represents the complete user guide for Espiron as of April 18, 2026. All user procedures, workflows, and feature guides are recorded herein for reference purposes.

For additional support or questions not covered in this documentation, please contact your system administrator or technical support team.

