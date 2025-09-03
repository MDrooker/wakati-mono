# Post Module

The Post module provides rich, Reddit‑style content publishing and discussion capabilities for the Rockwell platform. Posts support multiple content types (text, link, image, video, poll placeholder, structured JSON via Editor.js) with AI-assisted content moderation, tagging, asset attachment, voting, replies (self‑referential posts), and tenant isolation.

## Features

- **Create Posts**: Support for TEXT, LINK, IMAGE, VIDEO, POLL (placeholder), and JSON (Editor.js) types
- **Structured Editor Content**: JSON body stored + plain text extraction for search/moderation
- **AI Moderation Workflow**: Automatic moderation event dispatched for text/JSON content
- **Status Lifecycle**: Draft → Pending → Approved/Rejected → (Archived/Deleted)
- **Voting**: Basic upvote/downvote counters with hot score computation
- **Replies / Threading**: Self-referencing parent/child relationship to model comments as posts
- **Tagging & Assets**: Many-to-many with `Tag` and `Asset` entities
- **Publishing Control**: Explicit publish action once moderation passes
- **Visibility & Controls**: NSFW, spoiler, locked, stickied, original content, public/private
- **Metrics**: View, share, comment counts + computed score/hotScore
- **Tenant Isolation**: All queries optionally filtered by tenant URN
- **Cursor Pagination**: Supported through shared pagination utilities

## Entity Structure

Key fields in `Post`:

- `posturn`: Unique stable URN (`nesting:rockwell.post:<id>`) generated via nanoid (5 chars base16)
- `title`: Post title
- `body`: Rich text / markdown / HTML (nullable, by type)
- `bodyPlainText`: Normalized extracted plain text for search/moderation
- `bodyJson`: Editor.js structured content (for `postType = json`)
- `postType`: Enum (`text|link|image|video|poll|json`)
- `status`: Workflow status (`draft|pending|approved|rejected|archived|deleted`)
- `moderationStatus`: AI review status (`pending|processing|approved|rejected`)
- `moderationResults`: JSON payload from moderation service
- `moderationFailureReason`: Explanation when rejected/failure
- `url` / `domain`: For link posts (domain auto‑extracted)
- Voting & Metrics: `upvotes`, `downvotes`, `commentCount`, `viewCount`, `shareCount`
- Flags: `isNSFW`, `isSpoiler`, `isLocked`, `isStickied`, `isOC`, `isPublic`, `allowComments`
- Presentation: `flair`, `thumbnailUrl`
- Timestamps: `publishedAt`, `moderatedAt`, plus base `createdAt`, `updatedAt`
- Hierarchy: `parent_posturn` (if reply), `replies` collection
- Foreign Keys (logical): `userurn`, `tenanturn`
- Computed (methods/getters): `score`, `hotScore`, `canEdit()`, `isPublished()`, `isComment()`, `hasReplies()`, `isModerated()`

## Relationships

- **User (Many-to-One)**: Each post belongs to one user (`userurn` join without FK constraint enforcement)
- **Tenant (Many-to-One)**: Optional tenant scoping (`tenanturn`)
- **Assets (Many-to-Many)**: Attach multiple assets (join table: `post_assets`)
- **Tags (Many-to-Many)**: Flexible categorization (join table: `post_tags`)
- **Self (Many-to-One / One-to-Many)**: Replies implemented as posts referencing a `parent_posturn`

## Moderation Workflow

1. On create (and on content changes), if text/JSON content present → emit `'post.curation/start-content-moderation` event via Inngest
2. Post starts in `moderationStatus = pending` (or `processing` transient state)
3. External worker updates status to `approved` or `rejected` (stored in `moderationResults` / `moderationFailureReason`)
4. Publishing allowed only when `moderationStatus = approved`
5. Publish action sets `status = approved` and stamps `publishedAt`

If a post has no textual content (e.g., pure media asset) moderation may auto‑approve immediately.

## REST API Endpoints

Base path: `/posts`

- `POST /posts` (auth) – Create post (queues moderation if needed)
- `GET /posts` – List public approved posts (or user’s posts if authenticated)
- `GET /posts/my-posts` (auth) – List authenticated user’s posts
- `GET /posts/by-tags?tags=tag1,tag2` – Posts matching any of the tags
- `GET /posts/tags` – List all tags (with usage counts)
- `GET /posts/:posturn` – Retrieve single post (public visibility rules if unauthenticated)
- `GET /posts/:posturn/replies` – Retrieve approved replies
- `PATCH /posts/:posturn` (auth, owner, editable states only) – Update post; re-triggers moderation if body changed
- `POST /posts/:posturn/vote` (auth) – Upvote / downvote (simplified counters)
- `POST /posts/:posturn/publish` (auth, owner) – Publish after moderation approved
- `DELETE /posts/:posturn` (auth, owner) – Soft delete (`status = deleted`, `isActive = false`)

All endpoints optionally accept `tenanturn` query parameter for scoping.


Computed Fields: `score`, `hotScore`, `canEdit`, `isPublished`, `isComment`, `hasReplies`, `isModerated`.

## Security & Authorization

- **Authentication**: JWT required for create, update, vote, publish, delete
- **Ownership Enforcement**: Mutations verify `userurn` matches post owner (controller path uses request user)
- **Moderation Gate**: Cannot publish until moderation approved
- **Tenant Isolation**: `TenantInterceptor` resolves optional tenant filtering; queries restricted when `tenanturn` provided
- **Public Access**: Reading public, approved, moderated posts does not require authentication

## Usage Examples

### Creating a Text Post (Service Layer)

```typescript
const post = await postService.create({
	input: {
		title: 'Hello World',
		body: 'First post on the platform! 🎉',
		postType: PostType.TEXT,
		tags: ['introduction', 'hello']
	},
	userurn: 'nesting:rockwell.user:user123',
	tenanturn: 'nesting:rockwell.tenant:alpha'
});
```

### Creating an Editor.js JSON Post

```typescript
await postService.create({
	input: {
		title: 'Structured Content',
		postType: PostType.JSON,
		bodyJson: {
			time: Date.now(),
			blocks: [
				{ type: 'header', data: { text: 'Rich Post', level: 2 } },
				{ type: 'paragraph', data: { text: 'This is structured content.' } }
			],
			version: '2.29.0'
		},
		tags: ['editor', 'json']
	},
	userurn: 'nesting:rockwell.user:user123'
});
```

### Publishing a Post (After Moderation)

```typescript
await postService.publish(post.posturn, 'nesting:rockwell.user:user123');
```

### Voting on a Post

```typescript
await postService.vote(post.posturn, { vote: 1 }, 'nesting:rockwell.user:user456');
```

### Fetching Replies

```typescript
const replies = await postService.findReplies(post.posturn);
```

## Database Schema (Simplified)

```sql
CREATE TABLE rockwell.post (
	id SERIAL PRIMARY KEY,
	posturn VARCHAR UNIQUE NOT NULL,
	title VARCHAR NOT NULL,
	body TEXT,
	body_plain_text TEXT,
	body_json JSONB,
	post_type TEXT NOT NULL DEFAULT 'text',
	status TEXT NOT NULL DEFAULT 'draft',
	moderation_status TEXT NOT NULL DEFAULT 'pending',
	moderation_results JSONB,
	moderation_failure_reason TEXT,
	url TEXT,
	domain TEXT,
	upvotes INT DEFAULT 0,
	downvotes INT DEFAULT 0,
	comment_count INT DEFAULT 0,
	view_count INT DEFAULT 0,
	share_count INT DEFAULT 0,
	is_nsfw BOOLEAN DEFAULT FALSE,
	is_spoiler BOOLEAN DEFAULT FALSE,
	is_locked BOOLEAN DEFAULT FALSE,
	is_stickied BOOLEAN DEFAULT FALSE,
	is_oc BOOLEAN DEFAULT FALSE,
	is_public BOOLEAN DEFAULT TRUE,
	allow_comments BOOLEAN DEFAULT TRUE,
	flair VARCHAR,
	thumbnail_url TEXT,
	published_at TIMESTAMP,
	moderated_at TIMESTAMP,
	parent_posturn VARCHAR,
	userurn VARCHAR,
	tenanturn VARCHAR,
	is_active BOOLEAN DEFAULT TRUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
``` 

Join Tables:
```sql
CREATE TABLE rockwell.post_assets (
	posturn VARCHAR REFERENCES rockwell.post(posturn),
	asseturn VARCHAR REFERENCES rockwell.asset(asseturn),
	PRIMARY KEY (posturn, asseturn)
);

CREATE TABLE rockwell.post_tags (
	posturn VARCHAR REFERENCES rockwell.post(posturn),
	tagurn VARCHAR REFERENCES rockwell.tag(tagurn),
	PRIMARY KEY (posturn, tagurn)
);
```

## Indexes

Recommended / implied indexes:

- `UNIQUE (posturn)`
- `(userurn)`
- `(tenanturn)`
- `(status, moderation_status)` composite for feed filtering
- `(created_at)` for chronological queries
- `(parent_posturn)` for replies lookup
- `(post_type)` if filtering by type is frequent

## Notes & Implementation Details

- Soft deletion uses `isActive = false` plus `status = deleted`; data retained for audit
- Plain text extraction for Editor.js occurs in entity hook (strip & flatten blocks)
- Publishing requires both `status` and `moderationStatus` aligned (auto sets `publishedAt`)
- Hot score is a lightweight logarithmic decay heuristic (tunable)
- Tag creation is on-demand (auto-generates description); usage counts refreshed via queries
- Vote system is simplified; production system should maintain a separate vote table to prevent double voting
- Replies currently returned only if approved & moderated
- Moderation events dispatched via `InngestService` (`post.curation/start-content-moderation`)

## Future Enhancements (Ideas)

- Persistent vote tracking + idempotent toggling
- Full-text search indexing on `bodyPlainText`
- Rate limiting for create/update endpoints
- Advanced ranking (Wilson score, time decay variants)
- Media processing & thumbnail generation pipeline
- Poll post type implementation

---
This module follows the same architectural conventions as other domain modules (service + controller + resolver + TypeORM entity) ensuring consistency across the codebase.

