import os

try:
    import chromadb
    from chromadb.utils import embedding_functions
    HAS_CHROMA = True
except ImportError:
    HAS_CHROMA = False

CHROMA_PATH = os.getenv("CHROMA_DB_PATH", "chroma_db")

if HAS_CHROMA:
    # Initialise client and collection
    client = chromadb.PersistentClient(path=CHROMA_PATH)

    # Using local embeddings as per GEMINI.md
    embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(
        model_name="all-MiniLM-L6-v2"
    )

    collection = client.get_or_create_collection(
        name="amelie_memory",
        embedding_function=embedding_func
    )
else:
    collection = None

def add_memory(text: str, metadata: dict = None):
    """Add a text snippet to semantic memory."""
    if not collection:
        return
    import uuid
    collection.add(
        documents=[text],
        metadatas=[metadata or {}],
        ids=[str(uuid.uuid4())]
    )

def query_memory(query: str, n_results: int = 3):
    """Retrieve semantically relevant snippets."""
    if not collection:
        return []
    results = collection.query(
        query_texts=[query],
        n_results=n_results
    )
    return results["documents"][0] if results["documents"] else []
