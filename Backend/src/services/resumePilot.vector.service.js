const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const indexName = process.env.PINECONE_INDEX_NAME || "cohort-ai";

const resumePilotIndex = pc.Index(indexName);

const RESUME_NAMESPACE = "resume-memory";

// ======================================================
// UPSERT RESUME MEMORY
// ======================================================

async function createResumeMemory({
  id,
  vectors,
  metadata,
  namespace = RESUME_NAMESPACE,
}) {
  if (!id) {
    throw new Error("Vector ID is required");
  }

  if (!vectors || !vectors.length) {
    throw new Error("Vector is required");
  }

  await resumePilotIndex.namespace(namespace).upsert([
    {
      id: String(id),
      values: vectors,
      metadata,
    },
  ]);
}

// ======================================================
// BULK UPSERT
// ======================================================

async function createResumeMemories({ records, namespace = RESUME_NAMESPACE }) {
  if (!records || !records.length) {
    return;
  }

  await resumePilotIndex.namespace(namespace).upsert(records);
}

// ======================================================
// QUERY RESUME MEMORY
// ======================================================

async function queryResumeMemory({
  queryVector,
  userId,
  reportId,
  limit = 8,
  namespace = RESUME_NAMESPACE,
}) {
  if (!queryVector || !queryVector.length) {
    throw new Error("Query vector is required");
  }

  if (!userId) {
    throw new Error("User ID is required");
  }

  const filter = {
    userId: String(userId),
  };

  if (reportId) {
    filter.reportId = String(reportId);
  }

  const data = await resumePilotIndex.namespace(namespace).query({
    vector: queryVector,
    topK: limit,
    filter,
    includeMetadata: true,
  });

  return data.matches || [];
}

module.exports = {
  createResumeMemory,
  createResumeMemories,
  queryResumeMemory,
  RESUME_NAMESPACE,
};
