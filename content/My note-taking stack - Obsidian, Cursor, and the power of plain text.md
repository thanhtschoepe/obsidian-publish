---
title: My note-taking stack — Obsidian, Cursor, and the power of plain text
tags:
  - productivity
  - tools
  - ai
date: 2025-12-29
---
**Disclaimer**: This post is co-authored with Claude from a random rant.

At HubSpot, I've been using AI tooling a lot — Cursor for code, Claude for thinking through problems. But I've also started using Cursor for something unexpected: editing my notes.

My setup:
- **Obsidian** for writing and organizing
- **Obsidian Sync** for cross-device sync (cheap, works well)
- **Remotely Save** plugin for backup to OneDrive
- **Bases** plugin to query my notes like a database
- **Cursor** in agentic mode for heavy edits — refactoring, cross-linking, rewriting, or turning on-the-move voice note into texts.

The last one is the interesting part. Cursor treats my vault like a codebase. I can ask it to scan all my published articles and find cross-linking opportunities. I can paste rough thoughts and ask it to clean them up. I can refactor my folder structure.

I'm not paying extra for AI credits the way I would in Notion. Cursor's agentic mode is already part of my workflow for code — using it for notes is free; and it really help joining the context of my Code and the project since I can have both in a single Workspace.

# Why this works

Obsidian stores everything as markdown files in a folder. That's it. No proprietary format, no database lock-in. This means:

- Cursor can read and edit them directly
- Git can version them
- Any tool that understands text files can plug in
- I can publish them with Quartz (a static site generator) without export/import friction

Notion is nice, but your content lives in their database. You can export, but it's a one-way trip. You can't point Cursor at your Notion workspace and say "refactor this."

# The open source pattern

This reminds me of what I wrote about [[Bridging frontend and backend - BFF, meta-frameworks, and HTMX|frontend/backend boundaries]] — different tools solving the same problem from different directions. Obsidian doesn't try to do everything. It does markdown editing well and exposes a plugin API. The ecosystem fills in the rest.

Sync? There's a plugin for that. Backup? Plugin. Database queries? Plugin. AI editing? Just open the folder in Cursor.

Compare to Notion, which has to build every feature themselves. AI summarization costs extra. Version history is a paid tier. Backup is "export to CSV."

Open formats let you assemble your own stack. Closed platforms make you wait for them to ship features.

# The actual workflow

Day to day:
1. I write in Obsidian on my laptop or phone (Sync handles it)
2. Remotely Save pushes to OneDrive nightly — belt and suspenders
3. When I want to do something complex (bulk edits, cross-linking, rewriting), I open the vault in Cursor
4. Bases lets me query notes by tags, dates, or custom frontmatter — turns a folder into a lightweight database

I've been recycling old notes into blog posts this way. Rough ideas become drafts, drafts get cleaned up by AI, cleaned drafts get cross-linked. The whole vault is alive.

I don't think I could do this in Notion. The content would be stuck.

