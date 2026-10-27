/**
 * Normalization utilities for Trybe / Event objects.
 * Guarantees that any legacy or incomplete Firestore document
 * conforms safely to the schema expected across UI cards, feeds, maps, and chats.
 */

export interface NormalizedTrybe {
  id: string;
  title: string;
  name: string;
  category: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  startTime: string;
  endTime: string;
  dateTime: string;
  hostId: string;
  organizerId: string;
  host: {
    name: string;
    avatarUrl: string;
  };
  tags: string[];
  price: number;
  attendeesCount: number;
  rsvpCount: number;
  attendeeIds: string[];
  imageUrl: string;
  eventPictureUrl: string;
  isPromoted: boolean;
  createdAt?: string;
}

/**
 * Safely parse any date value (Firestore Timestamp, ISO string, epoch ms, Date object)
 */
export function safeFormatDate(val: any): string {
  if (!val) {
    return new Date().toISOString();
  }
  // Firestore Timestamp with toDate()
  if (typeof val === 'object' && typeof val.toDate === 'function') {
    try {
      return val.toDate().toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  // Timestamp object with seconds
  if (typeof val === 'object' && typeof val.seconds === 'number') {
    try {
      return new Date(val.seconds * 1000).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (typeof val === 'number') {
    try {
      return new Date(val).toISOString();
    } catch {
      return new Date().toISOString();
    }
  }
  if (typeof val === 'string') {
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }
  return new Date().toISOString();
}

/**
 * Normalizes a raw doc from Firestore into a guaranteed complete Trybe object.
 */
export function normalizeTrybe(doc: any): NormalizedTrybe {
  if (!doc) {
    return {
      id: '',
      title: 'Untitled Trybe',
      name: 'Untitled Trybe',
      category: 'social-networking',
      description: '',
      location: 'Local Venue',
      latitude: null,
      longitude: null,
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      dateTime: new Date().toISOString(),
      hostId: '',
      organizerId: '',
      host: { name: 'Trybe Host', avatarUrl: '' },
      tags: [],
      price: 0,
      attendeesCount: 0,
      rsvpCount: 0,
      attendeeIds: [],
      imageUrl: 'https://picsum.photos/seed/trybe/800/600',
      eventPictureUrl: 'https://picsum.photos/seed/trybe/800/600',
      isPromoted: false,
    };
  }

  const id = doc.id || '';
  const title = (doc.title || doc.name || 'Untitled Trybe').trim();
  const rawDate = doc.dateTime || doc.startTime;
  const startTime = safeFormatDate(rawDate);
  const endTime = safeFormatDate(doc.endTime || rawDate);
  const dateTime = startTime;

  const hostId = doc.hostId || doc.organizerId || '';
  const organizerId = hostId;

  // Safe host details
  const hostName = doc.host?.name || doc.hostName || doc.organizerName || 'Trybe Host';
  const hostAvatar = doc.host?.avatarUrl || doc.hostAvatarUrl || doc.organizerPhoto || '';

  // Safe tags array
  let tags: string[] = [];
  if (Array.isArray(doc.tags)) {
    tags = doc.tags.map((t: any) => String(t || '').trim()).filter(Boolean);
  } else if (typeof doc.tags === 'string') {
    tags = doc.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }

  // Safe location string
  let location = 'Local Venue';
  if (typeof doc.location === 'string' && doc.location.trim().length > 0) {
    location = doc.location.trim();
  } else if (doc.location && typeof doc.location === 'object') {
    location = doc.location.name || doc.location.address || 'Local Venue';
  }

  // Safe numbers
  const price = typeof doc.price === 'number' && !isNaN(doc.price) ? Math.max(0, doc.price) : 0;
  const attendeesCount =
    typeof doc.attendeesCount === 'number'
      ? doc.attendeesCount
      : typeof doc.rsvpCount === 'number'
      ? doc.rsvpCount
      : (Array.isArray(doc.attendeeIds) ? doc.attendeeIds.length : 0);

  const attendeeIds = Array.isArray(doc.attendeeIds) ? doc.attendeeIds : [];

  const imageUrl =
    doc.imageUrl ||
    doc.eventPictureUrl ||
    `https://picsum.photos/seed/${id || 'event'}/800/600`;

  return {
    id,
    title,
    name: title,
    category: (doc.category || 'social-networking').toLowerCase().replace(/\s+/g, '-'),
    description: doc.description || '',
    location,
    latitude: typeof doc.latitude === 'number' ? doc.latitude : (typeof doc.lat === 'number' ? doc.lat : null),
    longitude: typeof doc.longitude === 'number' ? doc.longitude : (typeof doc.lng === 'number' ? doc.lng : null),
    startTime,
    endTime,
    dateTime,
    hostId,
    organizerId,
    host: {
      name: hostName,
      avatarUrl: hostAvatar,
    },
    tags,
    price,
    attendeesCount,
    rsvpCount: attendeesCount,
    attendeeIds,
    imageUrl,
    eventPictureUrl: imageUrl,
    isPromoted: Boolean(doc.isPromoted),
    createdAt: doc.createdAt ? safeFormatDate(doc.createdAt) : undefined,
  };
}
