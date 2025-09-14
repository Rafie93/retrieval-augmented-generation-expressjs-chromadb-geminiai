const { client, embeddingFunction } = require("../chromaClient");

class CollectionManager {
  constructor() {
    this.client = client;
  }

  async searchAcrossCollections(query, userId, limit = 10) {
    try {
      const allCollections = await this.client.listCollections();
      const userCollections = await this.filterUserCollections(allCollections, userId);

      const allResults = [];

      const queryPromises = userCollections.map(async (collectionInfo) => {
        try {
          const collection = await this.client.getCollection({
            name: collectionInfo.name,
            embeddingFunction: embeddingFunction,
          });

          const results = await collection.query({
            queryTexts: [query],
            nResults: 5,
            where: { user_id: userId },
          });

          return {
            collection: collectionInfo.name,
            collection_metadata: collectionInfo.metadata,
            results: results,
          };
        } catch (error) {
          console.warn(`Error querying collection ${collectionInfo.name}:`, error.message);
          return null;
        }
      });

      const collectionsResults = await Promise.all(queryPromises);

      collectionsResults.forEach((collectionResult) => {
        if (collectionResult && collectionResult.results) {
          collectionResult.results.documents[0].forEach((doc, index) => {
            allResults.push({
              text: doc,
              similarity: collectionResult.results.distances[0][index],
              metadata: collectionResult.results.metadatas[0][index],
              collection: collectionResult.collection,
              collection_metadata: collectionResult.collection_metadata,
            });
          });
        }
      });

      allResults.sort((a, b) => a.similarity - b.similarity);
      return allResults.slice(0, limit);
    } catch (error) {
      console.error("Multi-collection search error:", error);
      throw new Error("Failed to search across collections");
    }
  }

  async searchAllCollections(query, limit = 10) {
    try {
      const allCollections = await this.client.listCollections();

      const allResults = [];
      const queryPromises = allCollections.map(async (collectionInfo) => {
        try {
          const collection = await this.client.getCollection({
            name: collectionInfo.name,
            embeddingFunction: embeddingFunction,
          });

          const results = await collection.query({
            queryTexts: [query],
            nResults: 3,
          });

          return {
            collection: collectionInfo.name,
            results: results,
          };
        } catch (error) {
          console.warn(`Error querying collection ${collectionInfo.name}:`, error.message);
          return null;
        }
      });

      const collectionsResults = await Promise.all(queryPromises);

      collectionsResults.forEach((collectionResult) => {
        if (collectionResult && collectionResult.results) {
          collectionResult.results.documents[0].forEach((doc, index) => {
            allResults.push({
              text: doc,
              similarity: collectionResult.results.distances[0][index],
              metadata: collectionResult.results.metadatas[0][index],
              collection: collectionResult.collection,
            });
          });
        }
      });

      allResults.sort((a, b) => a.similarity - b.similarity);
      return allResults.slice(0, limit);
    } catch (error) {
      console.error("Public search error:", error);
      throw new Error("Failed to search across collections");
    }
  }

  //  Filter collections by user ID
  async filterUserCollections(collections, userId) {
    const userCollections = [];

    for (const collectionInfo of collections) {
      try {
        const collection = await this.client.getCollection({
          name: collectionInfo.name,
          embeddingFunction: embeddingFunction,
        });

        const info = await collection.get();

        if (info.metadata && info.metadata.user_id == userId) {
          userCollections.push({
            name: collectionInfo.name,
            metadata: info.metadata,
          });
        }
      } catch (error) {
        continue;
      }
    }

    return userCollections;
  }

  //  Get all collections (public)
  async getAllCollections(limit = 50) {
    try {
      const allCollections = await this.client.listCollections();
      const collectionsWithStats = [];

      for (const collectionInfo of allCollections.slice(0, limit)) {
        try {
          const collection = await this.client.getCollection({
            name: collectionInfo.name,
            embeddingFunction: embeddingFunction,
          });

          const count = await collection.count();
          const info = await collection.get();

          collectionsWithStats.push({
            name: collectionInfo.name,
            document_count: count,
            metadata: info.metadata || {},
            created_at: info.metadata?.created_at || null,
          });
        } catch (error) {
          console.warn(`Error getting collection ${collectionInfo.name}:`, error.message);
          continue;
        }
      }

      return collectionsWithStats;
    } catch (error) {
      console.error("Error getting all collections:", error);
      throw error;
    }
  }

  // Search collections by keyword
  async searchCollections(searchTerm, userId = null, limit = 20) {
    let collections;

    if (userId) {
      const allCollections = await this.client.listCollections();
      collections = await this.filterUserCollections(allCollections, userId);
    } else {
      collections = await this.getAllCollections(100);
    }

    const filteredCollections = collections.filter((collection) => {
      const searchableText = [collection.name, collection.metadata?.original_filename, collection.metadata?.description, collection.metadata?.tags].filter(Boolean).join(" ").toLowerCase();

      return searchableText.includes(searchTerm.toLowerCase());
    });

    return filteredCollections.slice(0, limit);
  }

  // Get collection statistics
  async getCollectionStats(userId = null) {
    let collections;

    if (userId) {
      const allCollections = await this.client.listCollections();
      collections = await this.filterUserCollections(allCollections, userId);
    } else {
      collections = await this.getAllCollections();
    }

    const stats = {
      total_collections: collections.length,
      total_documents: 0,
      collections: [],
    };

    for (const collectionInfo of collections) {
      try {
        const collection = await this.client.getCollection({
          name: collectionInfo.name,
          embeddingFunction: embeddingFunction,
        });

        const count = await collection.count();
        stats.total_documents += count;

        stats.collections.push({
          name: collectionInfo.name,
          document_count: count,
          metadata: collectionInfo.metadata,
          created_at: collectionInfo.metadata?.created_at,
        });
      } catch (error) {
        continue;
      }
    }

    return stats;
  }
}

module.exports = CollectionManager;
