"""
Custom Data Structures for Aegis Autonomous Purchase Guardian.

Data Structures implemented:
1. Min-Heap (DeadlineHeap):
   - Backed by Python's `heapq` module.
   - Keyed by nearest deadline timestamp (`min(return_deadline, warranty_deadline)`).
   - Justification: In an autonomous guardian monitoring hundreds of purchases,
     retrieving the purchase with the most imminent deadline or performing a triage sweep
     requires O(1) peek and O(log n) insertion/removal. This completely eliminates
     the overhead of sorting the entire database table on every dashboard request or
     periodic polling cycle.

2. LRU Cache (LRUProductCache):
   - Implements a Least-Recently-Used cache with maxsize capacity and TTL expiration.
   - Justification: CPSC Recalls API queries for the same product names or model numbers
     recur frequently across users and sweeps. An LRU cache prevents redundant network round-trips
     to the federal API, prevents rate limiting, and speeds up recall checks to O(1) in-memory lookups.
"""

import heapq
import time
from collections import OrderedDict
from datetime import datetime, timezone
from typing import List, Tuple, Optional, Any, Dict


class DeadlineHeap:
    """
    Min-Heap keyed by nearest deadline.
    Stores entries as tuples: (deadline_timestamp, item_id, item_metadata)
    """
    def __init__(self):
        self._heap: List[Tuple[float, str, Dict[str, Any]]] = []
        self._entry_finder: Dict[str, Tuple[float, str, Dict[str, Any]]] = {}
        self._REMOVED = "<removed-item>"

    def push(self, item_id: str, deadline: datetime, metadata: Optional[Dict[str, Any]] = None):
        """
        Push or update an item's deadline in O(log n) time.
        Uses entry invalidation for efficient in-place updates.
        """
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)
        timestamp = deadline.timestamp()
        
        # If item already exists, mark previous entry as removed
        if item_id in self._entry_finder:
            self.remove(item_id)

        meta = metadata or {}
        entry = (timestamp, item_id, meta)
        self._entry_finder[item_id] = entry
        heapq.heappush(self._heap, entry)

    def remove(self, item_id: str):
        """Mark an existing entry as removed (lazy deletion)."""
        entry = self._entry_finder.pop(item_id, None)
        # Entry stays in heap but will be discarded when popped or swept

    def peek(self) -> Optional[Tuple[float, str, Dict[str, Any]]]:
        """Look at the nearest deadline without removing it in O(1) amortized time."""
        while self._heap:
            timestamp, item_id, meta = self._heap[0]
            if item_id is not self._REMOVED and item_id in self._entry_finder:
                return (timestamp, item_id, meta)
            heapq.heappop(self._heap)
        return None

    def pop(self) -> Optional[Tuple[float, str, Dict[str, Any]]]:
        """Pop the earliest deadline in O(log n) amortized time."""
        while self._heap:
            timestamp, item_id, meta = heapq.heappop(self._heap)
            if item_id is not self._REMOVED and item_id in self._entry_finder:
                del self._entry_finder[item_id]
                return (timestamp, item_id, meta)
        return None

    def get_items_sorted(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Returns active items ordered by nearest deadline without destroying the heap.
        O(n log n) bounded by limit.
        """
        # Purge any dead entries
        active_entries = [e for e in self._heap if e[1] is not self._REMOVED and e[1] in self._entry_finder]
        # Sort active entries by timestamp
        sorted_entries = sorted(active_entries, key=lambda x: x[0])
        if limit:
            sorted_entries = sorted_entries[:limit]
        
        results = []
        for ts, item_id, meta in sorted_entries:
            item_data = dict(meta)
            item_data["item_id"] = item_id
            item_data["nearest_deadline_ts"] = ts
            item_data["nearest_deadline"] = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
            results.append(item_data)
        return results

    def __len__(self) -> int:
        return len(self._entry_finder)


class LRUProductCache:
    """
    Least-Recently-Used (LRU) Cache with Time-To-Live (TTL) for CPSC API queries.
    Provides O(1) get/set with capacity eviction.
    """
    def __init__(self, capacity: int = 256, ttl_seconds: int = 3600):
        self.capacity = capacity
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict[str, Tuple[float, Any]] = OrderedDict()

    def _normalize_key(self, key: str) -> str:
        return key.strip().lower()

    def get(self, key: str) -> Optional[Any]:
        """Retrieve cached value if present and not expired; moves key to end (MRU)."""
        norm_key = self._normalize_key(key)
        if norm_key not in self._cache:
            return None
        
        insert_time, value = self._cache[norm_key]
        if time.time() - insert_time > self.ttl_seconds:
            # Expired
            del self._cache[norm_key]
            return None
            
        self._cache.move_to_end(norm_key)
        return value

    def set(self, key: str, value: Any):
        """Store value with timestamp; evicts LRU item if capacity exceeded."""
        norm_key = self._normalize_key(key)
        if norm_key in self._cache:
            self._cache.move_to_end(norm_key)
        self._cache[norm_key] = (time.time(), value)
        
        if len(self._cache) > self.capacity:
            self._cache.popitem(last=False)

    def clear(self):
        self._cache.clear()

    def __len__(self) -> int:
        return len(self._cache)


# Global in-memory singleton instances
global_deadline_heap = DeadlineHeap()
global_recall_lru_cache = LRUProductCache(capacity=500, ttl_seconds=7200)
