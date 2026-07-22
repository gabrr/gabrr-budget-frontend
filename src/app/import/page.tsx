"use client";

import {
  type ImportJobEvent,
  pollImportJob,
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
  const pollControllerRef = useRef<AbortController | null>(null);
  const seenTimelineEventsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => pollControllerRef.current?.abort();
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

  const uploadExample = async () => {
    if (!file) {
      appendTimeline(`Choose ${EXAMPLE_FILE_PATH} first.`);
      return;
    }

    pollControllerRef.current?.abort();
    seenTimelineEventsRef.current = new Set();
    setTimeline([]);
    window.localStorage.removeItem(TIMELINE_STORAGE_KEY);
    setIsUploading(true);

    try {
      appendTimeline(`Uploading ${file.name}`);
      const job = await uploadImportFile(file);
      rememberJob(job);
      appendJobTimeline(job);

      if (job.status === "pending" || job.status === "processing") {
        const controller = new AbortController();
        pollControllerRef.current = controller;
        await pollImportJob(
          job.status_url,
          (update) => {
            rememberJob(update);
            appendJobTimeline(update);
          },
          controller.signal,
        );
        pollControllerRef.current = null;
      }
      setIsUploading(false);
    } catch (error) {
      appendTimeline(error instanceof Error ? error.message : "Upload failed");
      setIsUploading(false);
    }
  };

  return (
    <Container maxW="3xl" py={10}>
      <VStack w="full" align="stretch" gap={6}>
        <Box>
          <Text as="h1" textStyle="pageTitle">
            PDF import job test
          </Text>
          <Text color="text.secondary" mt={2}>
            Select {EXAMPLE_FILE_PATH} and watch job events print below.
          </Text>
          {lastJob && (
            <Text color="text.secondary" mt={2} fontSize="sm">
              Last job: {lastJob.job_id} · {lastJob.status}
              {lastJob.current_step ? ` · ${lastJob.current_step}` : ""}
            </Text>
          )}
        </Box>

        <Box layerStyle="panel">
          <VStack align="stretch" gap={4}>
            <Input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button
              colorPalette="blue"
              onClick={uploadExample}
              loading={isUploading}
            >
              Upload and watch timeline
            </Button>
          </VStack>
        </Box>

        <Box
          layerStyle="panel"
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
