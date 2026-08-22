# UDAI MongoDB Schema

This document defines the MongoDB database structure for the UDAI web app.
It is intentionally standalone and not connected to the backend or frontend yet.

## Database Name

`udai`

## Core Collections

### `admins`
Stores admin portal users.

- `_id`
- `fullName`
- `email`
- `passwordHash`
- `role` (`admin`, `editor`, `viewer`)
- `isActive`
- `createdAt`
- `updatedAt`

### `therapistDepartments`
Groups therapists by department for the public team view.

- `_id`
- `name`
- `slug`
- `description`
- `isActive`
- `createdAt`
- `updatedAt`

### `therapists`
Public therapist/team profile data.

- `_id`
- `departmentId`
- `name`
- `role`
- `summary`
- `imageUrl`
- `sortOrder`
- `isFeatured`
- `isActive`
- `createdAt`
- `updatedAt`

### `contacts`
Contact form submissions.

- `_id`
- `name`
- `email`
- `subject`
- `message`
- `status` (`new`, `reviewed`, `replied`, `closed`)
- `createdAt`
- `updatedAt`

### `volunteers`
Volunteer form submissions.

- `_id`
- `name`
- `email`
- `phone`
- `interestArea`
- `availability`
- `message`
- `status` (`new`, `contacted`, `approved`, `rejected`)
- `createdAt`
- `updatedAt`

### `donations`
Donation intents and payment selections.

- `_id`
- `name`
- `email`
- `amount`
- `currency`
- `donationType` (`one-time`, `monthly`)
- `purpose`
- `message`
- `paymentMethod` (`qr`, `upi`, `netbanking`, `card`, `custom`)
- `paymentStatus` (`pending`, `initiated`, `paid`, `failed`, `refunded`)
- `transactionReference`
- `createdAt`
- `updatedAt`

### `therapistInquiries`
Department-wise appointment requests.

- `_id`
- `departmentId`
- `therapistId` optional
- `childName`
- `age`
- `referredBy`
- `majorConcerns`
- `enquirySource` (`Given by Tanu`, `Direct`)
- `requestType` (`view-slots`, `contact`)
- `appointmentDate` optional
- `status` (`new`, `assigned`, `contacted`, `scheduled`, `closed`, `cancelled`)
- `createdAt`
- `updatedAt`

### `careers`
Job and vacancy listings.

- `_id`
- `title`
- `department`
- `location`
- `employmentType`
- `experience`
- `description`
- `responsibilities` array
- `requirements` array
- `applyEmail`
- `applyLink`
- `isActive`
- `createdAt`
- `updatedAt`

### `careerApplications`
Applications submitted for career openings.

- `_id`
- `careerId`
- `name`
- `email`
- `phone`
- `resumeUrl`
- `message`
- `status` (`new`, `reviewed`, `shortlisted`, `rejected`, `hired`)
- `createdAt`
- `updatedAt`

### `productCategories`
Product grouping for the shop.

- `_id`
- `name`
- `slug`
- `description`
- `createdAt`
- `updatedAt`

### `products`
Store products.

- `_id`
- `categoryId`
- `title`
- `description`
- `price`
- `imageUrl`
- `inStock`
- `featured`
- `createdAt`
- `updatedAt`

### `orders`
Checkout orders for the shop.

- `_id`
- `customerName`
- `customerEmail`
- `customerPhone`
- `subtotal`
- `shippingAmount`
- `totalAmount`
- `paymentMethod`
- `paymentStatus`
- `orderStatus`
- `shippingAddress`
- `createdAt`
- `updatedAt`

### `orderItems`
Line items inside an order.

- `_id`
- `orderId`
- `productId`
- `quantity`
- `unitPrice`
- `lineTotal`
- `createdAt`

### `events`
Event listings.

- `_id`
- `title`
- `slug`
- `date`
- `time`
- `location`
- `description`
- `imageUrl`
- `category`
- `capacity`
- `attendeesCount`
- `isActive`
- `createdAt`
- `updatedAt`

### `eventRegistrations`
RSVP submissions for events.

- `_id`
- `eventId`
- `name`
- `email`
- `attendees`
- `status` (`registered`, `attended`, `cancelled`)
- `createdAt`
- `updatedAt`

### `blogPosts`
Blog and story content.

- `_id`
- `title`
- `slug`
- `author`
- `category`
- `excerpt`
- `content`
- `heroImageUrl`
- `readTime`
- `publishedAt`
- `isPublished`
- `createdAt`
- `updatedAt`

### `testimonials`
Testimonials shown on the site.

- `_id`
- `name`
- `role`
- `avatarUrl`
- `quote`
- `rating`
- `isActive`
- `createdAt`
- `updatedAt`

### `siteContent`
Editable page content blocks.

- `_id`
- `pageName`
- `sectionKey`
- `title`
- `subtitle`
- `body`
- `imageUrl`
- `ctaText`
- `ctaLink`
- `isActive`
- `createdAt`
- `updatedAt`

### `mediaFiles`
Uploaded files and image references.

- `_id`
- `fileName`
- `fileUrl`
- `fileType`
- `bucketName`
- `uploadedBy`
- `createdAt`

### `auditLogs`
Admin action history.

- `_id`
- `actorId`
- `actionType`
- `collectionName`
- `recordId`
- `changes`
- `createdAt`

## Recommended Indexes

- `admins.email`
- `therapistDepartments.slug`
- `therapists.departmentId`
- `therapists.isActive`
- `contacts.createdAt`
- `donations.createdAt`
- `donations.email`
- `therapistInquiries.departmentId`
- `therapistInquiries.status`
- `careers.department`
- `careers.isActive`
- `products.categoryId`
- `products.featured`
- `events.slug`
- `events.isActive`
- `blogPosts.slug`
- `blogPosts.isPublished`

## Workflow Notes

- Public site reads published or active content only.
- Forms write to submission collections first, then admin reviews them.
- Therapists should be shown department-wise with 2 to 3 members per department.
- Final therapist allocation should remain internal.
- Store images in cloud storage or local object storage, and save only URLs in MongoDB.
