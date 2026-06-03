import { pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';

export const meetings = pgTable('meetings', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  project: text('project'),
  members: jsonb('members').default([]),
  audioUrl: text('audio_url'),
  fileName: text('file_name'),
  status: text('status').default('pending'), // 'pending', 'processing', 'completed', 'failed'
  transcript: text('transcript'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  meetingId: uuid('meeting_id').references(() => meetings.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  assignee: text('assignee'),
  dueDate: text('due_date'), // stored as string format as extracted by AI
  status: text('status').default('pending'), // 'pending', 'processing', 'completed'
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role').default('viewer'), // 'admin', 'editor', 'viewer'
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const roles = pgTable('roles', {
  id: text('id').primaryKey(), // 'admin', 'editor', 'viewer', 'developer', 'qa', 'designer', 'manager'
  name: text('name').notNull(),
  description: text('description'),
});

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});



