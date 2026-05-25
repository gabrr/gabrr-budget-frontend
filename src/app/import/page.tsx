"use client";

import {
  API_BASE_URL,
  type ImportJobEvent,
  fetchImportJob,
  uploadImportFile,
} from "@/services/import";
import { Box, Button, Container, Input, Text, VStack } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

const EXAMPLE_FILE_PATH =
  "/Users/gabrieloliveira/Gabrr/gabrr-budget/backend/file_examples/rico-maio.pdf";
const TIMELINE_STORAGE_KEY = "gabrr:lastImportTimeline";
const LAST_JOB_STORAGE_KEY = "gabrr:lastImportJob";

function timelineLine(update: ImportJobEvent): string {
  const step = update.current_step ? ` · ${update.current_step}` : "";
  const error = update.error_message ? ` (${update.error_message})` : "";
  return `${new Date().toLocaleTimeString()} ${update.status}${step}${error}`;
}

function timelineEventKey(update: ImportJobEvent): string {
  return [
    update.status,
    update.current_step ?? "",
    update.error_message ?? "",
  ].join("|");
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [timeline, setTimeline] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    const storedTimeline = window.localStorage.getItem(TIMELINE_STORAGE_KEY);
    return storedTimeline ? (JSON.parse(storedTimeline) as string[]) : [];
  });
  const [lastJob, setLastJob] = useState<ImportJobEvent | null>(() => {
    if (typeof window === "undefined") return null;
    const storedJob = window.localStorage.getItem(LAST_JOB_STORAGE_KEY);
    return storedJob ? (JSON.parse(storedJob) as ImportJobEvent) : null;
  });
  const [isUploading, setIsUploading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const seenTimelineEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => eventSourceRef.current?.close();
  }, []);

  const appendTimeline = (line: string) => {
    setTimeline((items) => {
      const nextItems = [...items, line];
      window.localStorage.setItem(
        TIMELINE_STORAGE_KEY,
        JSON.stringify(nextItems),
      );
      return nextItems;
    });
  };

  const rememberJob = (job: ImportJobEvent) => {
    setLastJob(job);
    window.localStorage.setItem(LAST_JOB_STORAGE_KEY, JSON.stringify(job));
  };

  const appendJobTimeline = (job: ImportJobEvent) => {
    const key = timelineEventKey(job);
    if (seenTimelineEventsRef.current.has(key)) return;

    seenTimelineEventsRef.current.add(key);
    appendTimeline(timelineLine(job));
  };

  const pollStatus = async (statusUrl: string) => {
    try {
      const update = await fetchImportJob(statusUrl);
      rememberJob(update);
      appendJobTimeline(update);
    } catch (error) {
      appendTimeline(
        error instanceof Error ? error.message : "Status check failed",
      );
    }
  };

  const uploadExample = async () => {
    if (!file) {
      appendTimeline(`Choose ${EXAMPLE_FILE_PATH} first.`);
      return;
    }

    eventSourceRef.current?.close();
    seenTimelineEventsRef.current = new Set();
    setTimeline([]);
    window.localStorage.removeItem(TIMELINE_STORAGE_KEY);
    setIsUploading(true);

    try {
      appendTimeline(`Uploading ${file.name}`);
      const job = await uploadImportFile(file);
      rememberJob(job);
      appendJobTimeline(job);

      const events = new EventSource(`${API_BASE_URL}${job.events_url}`);
      eventSourceRef.current = events;

      events.addEventListener("progress", (event) => {
        const update = JSON.parse(event.data) as ImportJobEvent;
        rememberJob(update);
        appendJobTimeline(update);

        if (update.status === "done" || update.status === "failed") {
          events.close();
          eventSourceRef.current = null;
          setIsUploading(false);
        }
      });

      events.addEventListener("error", () => {
        appendTimeline(
          "Event stream disconnected; checking status once by polling.",
        );
        events.close();
        eventSourceRef.current = null;
        setIsUploading(false);
        void pollStatus(job.status_url);
      });
    } catch (error) {
      appendTimeline(error instanceof Error ? error.message : "Upload failed");
      setIsUploading(false);
    }
  };

  return (
    <Container maxW="3xl" py={10}>
      <VStack w="full" align="stretch" gap={6}>
        <Box>
          <Text fontSize="2xl" fontWeight="bold">
            PDF import job test
          </Text>
          <Text color="gray.600" mt={2}>
            Select {EXAMPLE_FILE_PATH} and watch job events print below.
          </Text>
          {lastJob && (
            <Text color="gray.600" mt={2} fontSize="sm">
              Last job: {lastJob.job_id} · {lastJob.status}
              {lastJob.current_step ? ` · ${lastJob.current_step}` : ""}
            </Text>
          )}
        </Box>

        <Box borderWidth="1px" borderColor="gray.200" rounded="md" p={5}>
          <VStack align="stretch" gap={4}>
            <Input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button
              colorScheme="teal"
              onClick={uploadExample}
              loading={isUploading}
            >
              Upload and watch timeline
            </Button>
          </VStack>
        </Box>

        <Box
          borderWidth="1px"
          borderColor="gray.200"
          rounded="md"
          p={5}
          minH="260px"
        >
          <Text fontWeight="semibold" mb={3}>
            Timeline
          </Text>
          <VStack as="ol" align="stretch" gap={2}>
            {timeline.map((line, index) => (
              <Text
                as="li"
                key={`${line}-${index}`}
                fontFamily="mono"
                fontSize="sm"
              >
                {line}
              </Text>
            ))}
          </VStack>
        </Box>
      </VStack>
    </Container>
  );
}
