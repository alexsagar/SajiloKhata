"use client"

import { KanbanCard, KanbanCardContent, KanbanCardHeader, KanbanCardTitle } from "@/components/ui/kanban-card"
import { Board, BoardColumn, BoardItem, Avatar, AvatarGroup } from "@/components/ui/board"
import { Pill } from "@/components/ui/pill"
import { Button } from "@/components/ui/button"
import { Plus, Filter, MoreHorizontal } from "lucide-react"

export default function KanbanDemoPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">Project Board</h1>
            <p className="text-slate-400 mt-1">Manage your tasks and track progress</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>

        {/* Board */}
        <Board>
          {/* Todo Column */}
          <BoardColumn title="Todo" count={4}>
            <BoardItem
              title="2022 KPI report"
              meta={<Pill color="blue">finance</Pill>}
              avatars={<Avatar fallback="JD" />}
            >
              Create comprehensive KPI analysis for the year 2022 including revenue metrics and growth indicators.
            </BoardItem>

            <BoardItem
              title="Improve Lighthouse score"
              meta={<Pill color="emerald">enhancement</Pill>}
              avatars={<AvatarGroup><Avatar fallback="SM" /><Avatar fallback="JD" /></AvatarGroup>}
            >
              Optimize website performance to achieve better Core Web Vitals scores.
            </BoardItem>

            <BoardItem
              title="Send email when user subscribes"
              meta={
                <div className="flex gap-2">
                  <Pill color="fuchsia">feature</Pill>
                  <Pill color="amber">marketing</Pill>
                </div>
              }
              avatars={<Avatar fallback="AL" />}
            >
              Implement automated email notifications for new subscriber onboarding.
            </BoardItem>

            <BoardItem
              title="Update landing page sponsors & testimonials"
              meta={<Pill color="emerald">enhancement</Pill>}
              avatars={<AvatarGroup><Avatar fallback="MK" /><Avatar fallback="JD" /><Avatar fallback="AL" /></AvatarGroup>}
            />
          </BoardColumn>

          {/* In Progress Column */}
          <BoardColumn title="In Progress" count={4}>
            <BoardItem
              title="Write 2023 roadmap"
              meta={<Pill color="amber">marketing</Pill>}
              avatars={<Avatar fallback="SM" />}
            >
              Document strategic goals and feature development plans for the upcoming year.
            </BoardItem>

            <BoardItem
              title="January 2023 Newsletter"
              meta={<Pill color="amber">marketing</Pill>}
              avatars={<AvatarGroup><Avatar fallback="AL" /><Avatar fallback="MK" /></AvatarGroup>}
            >
              Prepare monthly newsletter content with product updates and community highlights.
            </BoardItem>

            <BoardItem
              title="Blog article on how we designed our website"
              meta={<Pill color="amber">marketing</Pill>}
              avatars={<Avatar fallback="JD" />}
            >
              Write detailed case study about our design process and technical decisions.
            </BoardItem>

            <BoardItem
              title="chore: code improvement"
              meta={
                <div className="flex gap-2">
                  <Pill color="emerald">enhancement</Pill>
                  <Pill color="rose">bug</Pill>
                </div>
              }
              avatars={<AvatarGroup><Avatar fallback="SM" /><Avatar fallback="AL" /></AvatarGroup>}
            />
          </BoardColumn>

          {/* In Review Column */}
          <BoardColumn title="In Review" count={3}>
            <BoardItem
              title="Video storyboard"
              meta={
                <div className="flex gap-2">
                  <Pill color="fuchsia">video</Pill>
                  <Pill color="amber">marketing</Pill>
                </div>
              }
              avatars={<Avatar fallback="MK" />}
            >
              Develop storyboard for upcoming product demo video with scene breakdowns.
            </BoardItem>

            <BoardItem
              title="Responsive menu has too much padding"
              meta={<Pill color="rose">bug</Pill>}
              avatars={<AvatarGroup><Avatar fallback="JD" /><Avatar fallback="SM" /></AvatarGroup>}
            >
              Fix mobile navigation spacing issues affecting user experience.
            </BoardItem>

            <BoardItem
              title="Improve `Button` component"
              meta={<Pill color="emerald">enhancement</Pill>}
              avatars={<Avatar fallback="AL" />}
            />
          </BoardColumn>

          {/* Done Column */}
          <BoardColumn title="Done" count={6}>
            <BoardItem
              title="Video for VueJs Amsterdam"
              meta={<Pill color="fuchsia">video</Pill>}
              avatars={<Avatar fallback="MK" />}
            >
              Completed conference presentation video showcasing Vue.js implementation.
            </BoardItem>

            <BoardItem
              title="Improve documentation"
              meta={<Pill color="blue">documentation</Pill>}
              avatars={<AvatarGroup><Avatar fallback="JD" /><Avatar fallback="AL" /></AvatarGroup>}
            >
              Enhanced API documentation with better examples and use cases.
            </BoardItem>

            <BoardItem
              title="Update icons library"
              meta={<Pill color="amber">design</Pill>}
              avatars={<Avatar fallback="SM" />}
            />

            <BoardItem
              title="Update GitHub readme"
              meta={<Pill color="amber">marketing</Pill>}
              avatars={<Avatar fallback="AL" />}
            />

            <BoardItem
              title="Release new website"
              meta={<Pill color="fuchsia">feature</Pill>}
              avatars={<AvatarGroup><Avatar fallback="MK" /><Avatar fallback="JD" /><Avatar fallback="SM" /><Avatar fallback="AL" /></AvatarGroup>}
            />

            <BoardItem
              title="Create design system"
              meta={<Pill color="amber">design</Pill>}
              avatars={<Avatar fallback="MK" />}
            />
          </BoardColumn>
        </Board>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>Total Tasks</KanbanCardTitle>
            </KanbanCardHeader>
            <KanbanCardContent>
              <div className="text-3xl font-bold text-slate-100">17</div>
              <p className="text-slate-400 text-sm mt-1">Across all columns</p>
            </KanbanCardContent>
          </KanbanCard>

          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>In Progress</KanbanCardTitle>
            </KanbanCardHeader>
            <KanbanCardContent>
              <div className="text-3xl font-bold text-emerald-400">4</div>
              <p className="text-slate-400 text-sm mt-1">Active tasks</p>
            </KanbanCardContent>
          </KanbanCard>

          <KanbanCard>
            <KanbanCardHeader>
              <KanbanCardTitle>Completed</KanbanCardTitle>
            </KanbanCardHeader>
            <KanbanCardContent>
              <div className="text-3xl font-bold text-blue-400">6</div>
              <p className="text-slate-400 text-sm mt-1">This month</p>
            </KanbanCardContent>
          </KanbanCard>
        </div>
      </div>
    </div>
  )
}
