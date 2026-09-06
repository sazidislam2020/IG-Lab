import { jsPDF } from "jspdf";

/**
 * Generate a course completion certificate as PDF
 * @param {Object} params
 * @param {string} params.studentName - Student's full name
 * @param {string} params.courseName - Course title
 * @param {string} params.completionDate - Date of completion
 * @param {number} params.totalPoints - Total points earned
 * @param {string} params.certificateId - Unique certificate ID
 */
export function generateCertificate({
  studentName,
  courseName,
  completionDate,
  totalPoints,
  certificateId,
}) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  // Background
  doc.setFillColor(10, 14, 22); // #0A0E16
  doc.rect(0, 0, width, height, "F");

  // Border
  doc.setDrawColor(255, 107, 43); // #FF6B2B
  doc.setLineWidth(2);
  doc.rect(10, 10, width - 20, height - 20);

  // Inner border
  doc.setDrawColor(255, 107, 43, 0.3);
  doc.setLineWidth(0.5);
  doc.rect(15, 15, width - 30, height - 30);

  // Top accent line
  doc.setFillColor(255, 107, 43);
  doc.rect(width / 2 - 40, 30, 80, 2, "F");

  // Logo text
  doc.setTextColor(255, 107, 43);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("IGNITE LAB", width / 2, 42, { align: "center" });

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text("CERTIFICATE", width / 2, 65, { align: "center" });

  doc.setFontSize(14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(160, 160, 160);
  doc.text("OF COMPLETION", width / 2, 75, { align: "center" });

  // Decorative line
  doc.setFillColor(255, 107, 43, 0.5);
  doc.rect(width / 2 - 60, 82, 120, 0.5, "F");

  // "This certifies that"
  doc.setFontSize(12);
  doc.setTextColor(180, 180, 180);
  doc.text("This certifies that", width / 2, 95, { align: "center" });

  // Student name
  doc.setTextColor(255, 107, 43);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text(studentName || "Student", width / 2, 110, { align: "center" });

  // "has successfully completed"
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 180, 180);
  doc.text("has successfully completed the course", width / 2, 122, {
    align: "center",
  });

  // Course name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(courseName || "Course", width / 2, 136, { align: "center" });

  // Points earned
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Total Points Earned: ${totalPoints || 0}`,
    width / 2,
    148,
    { align: "center" }
  );

  // Bottom section
  doc.setFillColor(255, 107, 43, 0.5);
  doc.rect(width / 2 - 60, 155, 120, 0.5, "F");

  // Date
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  const date = completionDate
    ? new Date(completionDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
  doc.text(`Date: ${date}`, width / 4, 168, { align: "center" });

  // Certificate ID
  doc.text(
    `Certificate ID: ${certificateId || "N/A"}`,
    (width * 3) / 4,
    168,
    { align: "center" }
  );

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(
    "Ignite Lab — Robotics Education Platform",
    width / 2,
    height - 20,
    { align: "center" }
  );

  return doc;
}

/**
 * Download the certificate as PDF
 */
export function downloadCertificate(params) {
  const doc = generateCertificate(params);
  const fileName = `certificate-${params.courseName?.replace(/\s+/g, "-") || "course"}.pdf`;
  doc.save(fileName);
}

/**
 * Generate a unique certificate ID
 */
export function generateCertificateId(studentId, courseId) {
  const timestamp = Date.now().toString(36).toUpperCase();
  const studentHash = studentId?.slice(-4) || "0000";
  const courseHash = courseId?.slice(-4) || "0000";
  return `IL-${studentHash}-${courseHash}-${timestamp}`;
}

/**
 * Share certificate on social media
 */
export function shareCertificate({ studentName, courseName, certificateId }) {
  const text = `🎓 I just completed "${courseName}" on Ignite Lab!\n\nCertificate ID: ${certificateId}\n\n#IgniteLab #RoboticsEducation #Completed`;
  const url = `https://ig-lab-phi.vercel.app/`;

  // Check if Web Share API is available (mobile)
  if (navigator.share) {
    navigator.share({
      title: `Certificate - ${courseName}`,
      text: text,
      url: url,
    }).catch(() => {});
  } else {
    // Fallback: open Twitter/X share
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank");
  }
}

/**
 * Share certificate on LinkedIn
 */
export function shareOnLinkedIn({ studentName, courseName, certificateId }) {
  const text = `🎓 I just completed "${courseName}" on Ignite Lab!\n\nCertificate ID: ${certificateId}`;
  const url = `https://ig-lab-phi.vercel.app/`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`;
  window.open(linkedInUrl, "_blank");
}

/**
 * Share certificate on Facebook
 */
export function shareOnFacebook({ courseName, certificateId }) {
  const url = `https://ig-lab-phi.vercel.app/`;
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(`🎓 I just completed "${courseName}" on Ignite Lab!`)}`;
  window.open(fbUrl, "_blank");
}

/**
 * Copy certificate link to clipboard
 */
export async function copyCertificateLink({ certificateId }) {
  const url = `https://ig-lab-phi.vercel.app/`;
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
