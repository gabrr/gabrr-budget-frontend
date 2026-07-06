"use client";

import {
  API_BASE_URL,
  fetchImportJob,
  fetchImportJobs,
  type ImportJobEvent,
} from "@/services/import";
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

function isActiveJob(job: ImportJobEvent): boolean {
  return job.status === "pending" || job.status === "processing";
}

function statusBadgeStyle(status: ImportJobEvent["status"]) {
  if (status === "done") return { bg: "successSoft", color: "success" };
  if (status === "failed") return { bg: "dangerSoft", color: "danger" };
  if (status === "pending") return { bg: "warningSoft", color: "warning" };
  return { bg: "accent.blueSoft", color: "accent.blueHover" };
}

function formatTimestamp(value?: string | null): string {
  if (!value) return "Not available";
  return new Date(value).toLocaleString();
}

export default function ProcessesPage() {
  const [jobs, setJobs] = useState<ImportJobEvent[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [watchingJobId, setWatchingJobId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isMountedRef = useRef(false);

  const loadJobs = useCallback(async () => {
    setMessage(null);
    try {
      setJobs(await fetchImportJobs(20));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load jobs");
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    isMountedRef.current = true;
    fetchImportJobs(20)
      .then((nextJobs) => {
        if (isActive) setJobs(nextJobs);
      })
      .catch((error) => {
        if (!isActive) return;
        setMessage(error instanceof Error ? error.message : "Could not load jobs");
      });

    return () => {
      isActive = false;
      isMountedRef.current = false;
      eventSourceRef.current?.close();
    };
  }, []);

  const updateJob = (update: ImportJobEvent) => {
    setJobs((currentJobs) =>
      currentJobs.map((job) => (job.job_id === update.job_id ? update : job)),
    );
  };

  const watchProcess = (job: ImportJobEvent) => {
    if (!isActiveJob(job)) return;

    eventSourceRef.current?.close();
    setWatchingJobId(job.job_id);

    const events = new EventSource(`${API_BASE_URL}${job.events_url}`);
    eventSourceRef.current = events;

    events.addEventListener("progress", (event) => {
      const update = JSON.parse(event.data) as ImportJobEvent;
      if (!isMountedRef.current) return;
      updateJob(update);

      if (!isActiveJob(update)) {
        events.close();
        eventSourceRef.current = null;
        setWatchingJobId(null);
      }
    });

    events.addEventListener("error", () => {
      events.close();
      eventSourceRef.current = null;
      setWatchingJobId(null);
      void fetchImportJob(job.status_url)
        .then((update) => {
          if (isMountedRef.current) updateJob(update);
        })
        .catch(() => undefined);
    });
  };

  return (
    <Box as="main" layerStyle="page">
      <Container maxW="1480px" px={{ base: "4", md: "8", lg: "10" }} py="8">
        <Flex
          as="header"
          align={{ base: "stretch", md: "flex-end" }}
          direction={{ base: "column", md: "row" }}
          gap="6"
          justify="space-between"
          pb="6"
        >
          <Stack gap="2">
            <Heading as="h1" textStyle="pageTitle">
              Processes
            </Heading>
            <Text textStyle="subtitle">
              Review recent statement imports and reconnect to active work.
            </Text>
          </Stack>

          <Flex flexWrap="wrap" gap="3" justify={{ md: "flex-end" }}>
            <Button type="button" variant="outline" onClick={loadJobs}>
              Refresh
            </Button>
            <Button asChild variant="outline">
              <NextLink href="/dashboard">Dashboard</NextLink>
            </Button>
          </Flex>
        </Flex>

        <Stack as="section" gap="4" aria-label="Recent import jobs">
          {jobs.length === 0 ? (
            <Box layerStyle="panel">
              <Text color="text.secondary">No import jobs yet.</Text>
            </Box>
          ) : (
            jobs.map((job) => {
              const active = isActiveJob(job);
              return (
                <Box as="article" key={job.job_id} layerStyle="panel">
                  <Stack gap="4">
                    <Flex align="flex-start" gap="4" justify="space-between">
                      <Stack gap="1">
                        <Heading as="h2" textStyle="panelTitle">
                          Statement import
                        </Heading>
                        <Text textStyle="monoId">{job.job_id}</Text>
                      </Stack>
                      <Badge variant="subtle" {...statusBadgeStyle(job.status)}>
                        {job.status}
                      </Badge>
                    </Flex>

                    <Text color="text.primary">
                      {job.current_step ?? "Waiting for status update"}
                    </Text>

                    {job.original_filename && (
                      <Text
                        color="text.primary"
                        fontWeight="600"
                        overflowWrap="anywhere"
                      >
                        {job.original_filename}
                      </Text>
                    )}

                    {job.statement_kind !== "unknown" && (
                      <Text textStyle="metadata">
                        {job.statement_kind}
                        {job.statement_kind_confidence
                          ? ` · ${Math.round(Number(job.statement_kind_confidence) * 100)}%`
                          : ""}
                      </Text>
                    )}

                    {job.error_message && (
                      <Text color="danger">{job.error_message}</Text>
                    )}

                    <SimpleGrid as="dl" columns={{ base: 1, md: 2 }} gap="4" m="0">
                      <Box>
                        <Text
                          as="dt"
                          color="text.secondary"
                          fontSize="12px"
                          fontWeight="700"
                          letterSpacing="0.02em"
                          textTransform="uppercase"
                        >
                          Created
                        </Text>
                        <Text as="dd" m="0">
                          {formatTimestamp(job.created_at)}
                        </Text>
                      </Box>
                      <Box>
                        <Text
                          as="dt"
                          color="text.secondary"
                          fontSize="12px"
                          fontWeight="700"
                          letterSpacing="0.02em"
                          textTransform="uppercase"
                        >
                          Updated
                        </Text>
                        <Text as="dd" m="0">
                          {formatTimestamp(job.updated_at)}
                        </Text>
                      </Box>
                    </SimpleGrid>

                    <Button
                      alignSelf="flex-start"
                      type="button"
                      disabled={!active || watchingJobId === job.job_id}
                      onClick={() => watchProcess(job)}
                    >
                      {watchingJobId === job.job_id ? "Watching" : "Watch"}
                    </Button>
                  </Stack>
                </Box>
              );
            })
          )}
        </Stack>

        {message && (
          <Box layerStyle="inlineBanner" mt="4" maxW="720px">
            {message}
          </Box>
        )}
      </Container>
    </Box>
  );
}
