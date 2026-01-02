import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

// Type for skill in API response
interface SkillData {
  name?: string;
  skill?: { name: string };
}

// Type for study room API response
interface StudyRoomData {
  id: string;
  title: string;
  description?: string;
  date: string;
  duration: number;
  maxParticipants: number;
  participantCount?: number;
  createdBy?: {
    id: string;
    name: string;
    avatar?: string;
  };
  skills?: SkillData[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  
  // Fetch room data
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  let room: StudyRoomData | null = null;
  
  try {
    const response = await fetch(`${baseUrl}/api/study-rooms/${roomId}`, {
      next: { revalidate: 60 },
    });
    if (response.ok) {
      room = await response.json();
    }
  } catch (e) {
    console.error("Failed to fetch room for OG image", e);
  }

  // Format date/time
  const formattedDate = room
    ? new Date(room.date).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "TBA";
  const formattedTime = room
    ? new Date(room.date).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Extract skills (max 4 for display)
  const skills = room?.skills
    ?.slice(0, 4)
    ?.map((s: SkillData) => {
      if (typeof s === "string") return s;
      return s.skill?.name || s.name || "";
    })
    .filter(Boolean) || [];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#0a0a0a",
          backgroundImage: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)",
          padding: "50px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header with logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                backgroundColor: "#22c55e",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "28px",
              }}
            >
              🎓
            </div>
            <span
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                color: "#22c55e",
                letterSpacing: "-0.5px",
              }}
            >
              Webyalaya
            </span>
          </div>
          <div
            style={{
              backgroundColor: "#22c55e20",
              border: "2px solid #22c55e",
              borderRadius: "24px",
              padding: "8px 24px",
              color: "#22c55e",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            Study Room
          </div>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Title */}
          <div
            style={{
              fontSize: room && room.title.length > 40 ? "48px" : "56px",
              fontWeight: "bold",
              color: "white",
              lineHeight: 1.2,
              marginBottom: "32px",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
            }}
          >
            {room?.title || "Study Room"}
          </div>

          {/* Teacher info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#374151",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
                color: "white",
                fontWeight: "bold",
                overflow: "hidden",
              }}
            >
              {room?.createdBy?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={room.createdBy.avatar}
                  width={56}
                  height={56}
                  style={{ objectFit: "cover" }}
                  alt=""
                />
              ) : (
                room?.createdBy?.name?.charAt(0) || "T"
              )}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <span style={{ color: "#9ca3af", fontSize: "16px" }}>
                Hosted by
              </span>
              <span
                style={{
                  color: "white",
                  fontSize: "24px",
                  fontWeight: "600",
                }}
              >
                {room?.createdBy?.name || "Teacher"}
              </span>
            </div>
          </div>

          {/* Date, Time, Duration */}
          <div
            style={{
              display: "flex",
              gap: "40px",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "28px" }}>📅</span>
              <span
                style={{
                  color: "#e5e7eb",
                  fontSize: "22px",
                  fontWeight: "500",
                }}
              >
                {formattedDate}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "28px" }}>⏰</span>
              <span
                style={{
                  color: "#e5e7eb",
                  fontSize: "22px",
                  fontWeight: "500",
                }}
              >
                {formattedTime}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <span style={{ fontSize: "28px" }}>⏱️</span>
              <span
                style={{
                  color: "#e5e7eb",
                  fontSize: "22px",
                  fontWeight: "500",
                }}
              >
                {room?.duration || 60} min
              </span>
            </div>
          </div>

          {/* Skills/Topics */}
          {skills.length > 0 && (
            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >
              {skills.map((skill, i) => (
                <div
                  key={i}
                  style={{
                    padding: "10px 24px",
                    backgroundColor: "rgba(34, 197, 94, 0.15)",
                    border: "1px solid rgba(34, 197, 94, 0.4)",
                    borderRadius: "24px",
                    color: "#4ade80",
                    fontSize: "18px",
                    fontWeight: "500",
                  }}
                >
                  {skill}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <span
            style={{
              color: "#9ca3af",
              fontSize: "18px",
            }}
          >
            Click to view session details and join
          </span>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#22c55e",
              fontSize: "18px",
              fontWeight: "600",
            }}
          >
            Join Now →
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

