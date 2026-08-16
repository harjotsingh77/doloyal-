"use client";

import * as React from "react";
import { AlertCircle, Link2, RefreshCw, Settings2, Unlink } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@doloyal/ui";

export interface IntegrationCardProps {
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  connected: boolean;
  connecting?: boolean;
  syncing?: boolean;
  supportsSync?: boolean;
  healthError?: boolean;
  connectedDetail?: string | null;
  onConnect: () => void;
  onManage: () => void;
  onSync?: () => void;
  onDisconnect: () => void;
}

/**
 * Presentational card for a single integration. Connection state and all
 * actions are driven by the parent — this component never stores fake state.
 */
export function IntegrationCard({
  name,
  description,
  category,
  icon,
  connected,
  connecting = false,
  syncing = false,
  supportsSync = false,
  healthError = false,
  connectedDetail,
  onConnect,
  onManage,
  onSync,
  onDisconnect,
}: IntegrationCardProps) {
  return (
    <Card
      className="flex h-full flex-col p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-[rgb(var(--color-muted-foreground)/0.35)] hover:shadow-[var(--shadow-soft)]"
    >
      {/* Top row: logo + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgb(var(--color-border))] bg-[rgb(var(--color-surface-2))]">
          {icon}
        </div>

        {connected ? (
          <Badge variant="success" className="gap-1.5 px-2.5 text-[0.68rem]">
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            Connected
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="gap-1.5 bg-[rgb(var(--color-muted))] px-2.5 text-[0.68rem] text-[rgb(var(--color-muted-foreground))]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-[rgb(var(--color-subtle))]" aria-hidden="true" />
            Not connected
          </Badge>
        )}
      </div>

      {/* Name + description */}
      <div className="mt-4 flex-1">
        <h3 className="text-[0.95rem] font-semibold leading-snug text-[rgb(var(--color-foreground))]">
          {name}
        </h3>
        <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[rgb(var(--color-muted-foreground))] line-clamp-2">
          {description}
        </p>

        {/* Connected detail */}
        {connected && connectedDetail ? (
          <p className="mt-2 text-xs text-[rgb(var(--color-muted-foreground))] line-clamp-1">
            Connected as <span className="font-medium text-[rgb(var(--color-foreground))]">{connectedDetail}</span>
          </p>
        ) : connected ? (
          <p className="mt-2 text-xs text-[rgb(var(--color-muted-foreground))]">Connected successfully</p>
        ) : null}

        {/* Category + health */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge
            variant="default"
            className="rounded-md px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wider text-[rgb(var(--color-muted-foreground))]"
          >
            {category}
          </Badge>
          {connected && healthError && (
            <Badge variant="danger" className="gap-1 px-2 py-0.5 text-[0.62rem]">
              <AlertCircle className="h-3 w-3" />
              Error
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom action */}
      <div className="mt-4 pt-1">
        {connected ? (
          <div className="flex flex-col gap-2 min-[400px]:flex-row min-[400px]:items-center">
            <Button
              variant="secondary"
              size="sm"
              className="w-full min-[400px]:flex-1"
              onClick={onManage}
              aria-label={`Manage ${name}`}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Manage
            </Button>

            <div className="flex items-center gap-2">
              {supportsSync ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={onSync}
                      disabled={syncing}
                      loading={syncing}
                      aria-label={`Sync ${name}`}
                      className="shrink-0"
                    >
                      {!syncing ? <RefreshCw className="h-3.5 w-3.5" /> : null}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Sync now</TooltipContent>
                </Tooltip>
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                onClick={onDisconnect}
                aria-label={`Disconnect ${name}`}
                className="w-full min-[400px]:w-auto shrink-0 px-2.5 text-[rgb(var(--color-muted-foreground))] transition-colors hover:bg-[rgb(var(--color-danger)/0.1)] hover:text-[rgb(var(--color-danger))]"
              >
                <Unlink className="h-3.5 w-3.5" />
                Disconnect
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={onConnect}
            loading={connecting}
            disabled={connecting}
          >
            {connecting ? (
              "Connecting..."
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Connect
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}
