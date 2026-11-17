# Se'kret Bip — Circle V1 Implementation Spec

## 1. Permissions Matrix

| Feature | Public Circle | Friends Circle | Crew Circle | Parent Circle |
|---|---|---|---|---|
| View Posts | ✅ | ✅ Friends Only | ✅ Crew Only | ✅ Parent Connections |
| Create Posts | ✅ | ✅ | ✅ | ✅ |
| Anonymous By Default | ✅ Always | ❌ Optional Nickname | ❌ Identity Visible | ✅ Always |
| Real Identity Visible | ❌ | Nickname Only | ✅ | Only Inside Parent Connections |
| Connection Model | None | Add To My Circle | Crew Invite | Parent Connect |
| Comments | ❌ Reactions Only | ✅ | ✅ | ✅ |
| Reactions | ✅ | ✅ | ✅ | ✅ |
| Share to Crew | ❌ | Optional | Native | ❌ |
| Profile View | ❌ | Limited | Trusted | Limited |
| Report User | ✅ | ✅ | ✅ | ✅ |
| Block User | ✅ | ✅ | ✅ | ✅ |

---

## 2. Navigation

```
Circle
├── 🌎 Public
├── 💜 Friends
├── 🤝 Crew
└── 🌿 Parent
```

Top tabs render in this order. Each tab is a distinct feed with its own visibility and identity rules.

---

## 3. Composer Flow

Prompt shown at top of composer:

> **Where do you want this Bip to go?**

| Destination | Identity shown |
|---|---|
| 🌎 Public Circle | Posting anonymously |
| 💜 Friends Circle | Posting as: `MoonGirl_17` (chosen nickname) |
| 🤝 Crew Circle | Posting as: `Raylene 💜` (identity visible) |
| 🌿 Parent Circle | Posting anonymously |

Composer resolves identity automatically based on destination. No extra taps required.

---

## 4. Canonical Se'kret Bip Terms

Replace generic social terms with Se'kret Bip language throughout the app:

| Generic Term | Se'kret Bip Term |
|---|---|
| Friend Request | Add To My Circle |
| Friends | My Circle |
| Mutual Friends | Shared Circles |
| Followers | People Who Bip With Me |

---

## 5. Backend Tables

Required tables to audit and verify (`db/schema.sql` is retired — check `supabase/migrations/` instead):

```
circle_profiles
circle_friend_requests
circle_friendships
crew_memberships
public_circle_posts
friends_circle_posts
crew_circle_posts
parent_circle_posts
circle_comments
circle_reactions
blocked_users
reported_posts
```

RLS must be scoped per circle type. Parent Circle tables are isolated from Friends and Crew visibility logic.

---

## 6. Identity & Visibility Rules

- **Public Circle** — anonymous only. No profile views. No comments. Reactions only.
- **Friends Circle** — chosen nickname/avatar visible. Comments allowed. Identity never fully revealed.
- **Crew Circle** — real identity visible because trust was explicitly accepted via Crew invite.
- **Parent Circle** — completely separate feed. Anonymous by default. Identity revealed only inside active parent connections. Never treated as a general social feed.

---

## 7. Implementation Checklist

- [ ] Add four-tab Circle navigation (Public, Friends, Crew, Parent)
- [ ] Build destination-first composer that resolves identity per circle
- [ ] Enforce anonymous posting for Public and Parent
- [ ] Disable comments on Public Circle feed (reactions only)
- [ ] Enable comments on Friends, Crew, and Parent
- [ ] Add block/report controls on all four circle feeds
- [ ] Align `supabase/migrations/` with all circle tables (`db/schema.sql` is retired)
- [ ] Add RLS policies scoped by circle type and auth.uid()
- [ ] Keep Parent Circle data isolated from other circle queries
- [ ] Replace all generic social copy with Se'kret Bip terms
