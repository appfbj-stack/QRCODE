-- Migration: OBPC QR Code Presenca
-- Adiciona módulo de cadastro e presença de obreiros com QR Code
-- (multi-tenant, multi-igreja, em cima da base já existente)

-- Enums
CREATE TYPE "ObpcMemberRole" AS ENUM ('PASTOR', 'PRESBITERO', 'EVANGELISTA', 'MISSIONARIA', 'DIACONO', 'DIACONISA', 'MEMBRO');
CREATE TYPE "ObpcCandidateTarget" AS ENUM ('MISSIONARIO', 'PRESBITERO', 'EVANGELISTA', 'DIACONO', 'DIACONISA', 'OBREIRO');
CREATE TYPE "ObpcMemberStatus" AS ENUM ('ATIVO', 'INATIVO', 'CANDIDATO', 'EM_FORMACAO', 'TRANSFERIDO', 'DESLIGADO');
CREATE TYPE "ObpcEventStatus" AS ENUM ('ABERTO', 'ENCERRADO', 'CANCELADO');
CREATE TYPE "ObpcCandidateStatus" AS ENUM ('INSCRITO', 'EM_FORMACAO', 'CONCLUIDO', 'APROVADO', 'REPROVADO', 'SUSPENSO', 'CONSAGRADO', 'ARQUIVADO');
CREATE TYPE "ObpcClassAttendanceStatus" AS ENUM ('PRESENTE', 'FALTA', 'JUSTIFICADO');

-- Tabela: ObpcEvent (evento de presença — culto, reunião, curso, congresso)
CREATE TABLE "ObpcEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "congregationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "time" TEXT,
    "location" TEXT,
    "hostChurch" TEXT,
    "status" "ObpcEventStatus" NOT NULL DEFAULT 'ABERTO',
    "qrToken" TEXT,
    "qrRotatedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ObpcEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ObpcEvent_qrToken_key" ON "ObpcEvent"("qrToken");
CREATE INDEX "ObpcEvent_tenantId_idx" ON "ObpcEvent"("tenantId");
CREATE INDEX "ObpcEvent_status_idx" ON "ObpcEvent"("status");
CREATE INDEX "ObpcEvent_date_idx" ON "ObpcEvent"("date");
CREATE INDEX "ObpcEvent_congregationId_idx" ON "ObpcEvent"("congregationId");

ALTER TABLE "ObpcEvent" ADD CONSTRAINT "ObpcEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObpcEvent" ADD CONSTRAINT "ObpcEvent_congregationId_fkey" FOREIGN KEY ("congregationId") REFERENCES "Congregation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Tabela: ObpcAttendance (registro de presença)
CREATE TABLE "ObpcAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "memberId" TEXT,
    "memberName" TEXT NOT NULL,
    "memberRole" TEXT,
    "churchName" TEXT,
    "method" TEXT NOT NULL DEFAULT 'qrcode',
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ObpcAttendance_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ObpcAttendance_tenantId_idx" ON "ObpcAttendance"("tenantId");
CREATE INDEX "ObpcAttendance_eventId_idx" ON "ObpcAttendance"("eventId");
CREATE INDEX "ObpcAttendance_memberId_idx" ON "ObpcAttendance"("memberId");
CREATE INDEX "ObpcAttendance_createdAt_idx" ON "ObpcAttendance"("createdAt");
CREATE UNIQUE INDEX "ObpcAttendance_eventId_memberId_key" ON "ObpcAttendance"("eventId", "memberId");

ALTER TABLE "ObpcAttendance" ADD CONSTRAINT "ObpcAttendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObpcAttendance" ADD CONSTRAINT "ObpcAttendance_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ObpcEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObpcAttendance" ADD CONSTRAINT "ObpcAttendance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Tabela: ObpcCourse (curso de formação)
CREATE TABLE "ObpcCourse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "target" "ObpcCandidateTarget",
    "teacher" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ativo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ObpcCourse_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ObpcCourse_tenantId_idx" ON "ObpcCourse"("tenantId");
CREATE INDEX "ObpcCourse_status_idx" ON "ObpcCourse"("status");

ALTER TABLE "ObpcCourse" ADD CONSTRAINT "ObpcCourse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tabela: ObpcCourseEnrollment (inscrição de candidato no curso)
CREATE TABLE "ObpcCourseEnrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "memberId" TEXT,
    "candidateName" TEXT NOT NULL,
    "candidatePhone" TEXT,
    "churchName" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ObpcCandidateStatus" NOT NULL DEFAULT 'INSCRITO',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ObpcCourseEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ObpcCourseEnrollment_courseId_memberId_key" ON "ObpcCourseEnrollment"("courseId", "memberId");
CREATE INDEX "ObpcCourseEnrollment_tenantId_idx" ON "ObpcCourseEnrollment"("tenantId");
CREATE INDEX "ObpcCourseEnrollment_courseId_idx" ON "ObpcCourseEnrollment"("courseId");
CREATE INDEX "ObpcCourseEnrollment_status_idx" ON "ObpcCourseEnrollment"("status");

ALTER TABLE "ObpcCourseEnrollment" ADD CONSTRAINT "ObpcCourseEnrollment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObpcCourseEnrollment" ADD CONSTRAINT "ObpcCourseEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ObpcCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObpcCourseEnrollment" ADD CONSTRAINT "ObpcCourseEnrollment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Tabela: ObpcCourseClass (aula do curso)
CREATE TABLE "ObpcCourseClass" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT,
    "classNumber" INTEGER NOT NULL DEFAULT 1,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    CONSTRAINT "ObpcCourseClass_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ObpcCourseClass_tenantId_idx" ON "ObpcCourseClass"("tenantId");
CREATE INDEX "ObpcCourseClass_courseId_idx" ON "ObpcCourseClass"("courseId");
CREATE INDEX "ObpcCourseClass_date_idx" ON "ObpcCourseClass"("date");

ALTER TABLE "ObpcCourseClass" ADD CONSTRAINT "ObpcCourseClass_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObpcCourseClass" ADD CONSTRAINT "ObpcCourseClass_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "ObpcCourse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tabela: ObpcCourseClassAttendance (frequência por aula)
CREATE TABLE "ObpcCourseClassAttendance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "status" "ObpcClassAttendanceStatus" NOT NULL DEFAULT 'PRESENTE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ObpcCourseClassAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ObpcCourseClassAttendance_classId_enrollmentId_key" ON "ObpcCourseClassAttendance"("classId", "enrollmentId");
CREATE INDEX "ObpcCourseClassAttendance_tenantId_idx" ON "ObpcCourseClassAttendance"("tenantId");
CREATE INDEX "ObpcCourseClassAttendance_classId_idx" ON "ObpcCourseClassAttendance"("classId");
CREATE INDEX "ObpcCourseClassAttendance_enrollmentId_idx" ON "ObpcCourseClassAttendance"("enrollmentId");

ALTER TABLE "ObpcCourseClassAttendance" ADD CONSTRAINT "ObpcCourseClassAttendance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObpcCourseClassAttendance" ADD CONSTRAINT "ObpcCourseClassAttendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ObpcCourseClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ObpcCourseClassAttendance" ADD CONSTRAINT "ObpcCourseClassAttendance_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "ObpcCourseEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
