import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';

export async function getAnalyticsOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user!;
    
    // Scope filters based on multi-tenant hospitalId unless SUPER_ADMIN
    const hospitalFilter = user.role === 'SUPER_ADMIN'
      ? (req.query.hospitalId ? { hospitalId: req.query.hospitalId as string } : {})
      : { hospitalId: user.hospitalId! };

    const patientWhereClause = {
      ...hospitalFilter,
      deletedAt: null,
    };

    // 1. Total Patient count
    const patientCount = await prisma.patient.count({
      where: patientWhereClause,
    });

    // 2. Risk Distribution (LOW, MODERATE, HIGH, CRITICAL)
    const riskDistributionRaw = await prisma.prediction.groupBy({
      by: ['riskCategory'],
      where: {
        patient: patientWhereClause,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    const riskDistribution = {
      LOW: 0,
      MODERATE: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    riskDistributionRaw.forEach((item) => {
      const category = item.riskCategory as keyof typeof riskDistribution;
      if (category in riskDistribution) {
        riskDistribution[category] = item._count.id;
      }
    });

    // 3. Prediction types count (DIABETES, CARDIOVASCULAR, etc.)
    const predictionTypeRaw = await prisma.prediction.groupBy({
      by: ['predictionType'],
      where: {
        patient: patientWhereClause,
        deletedAt: null,
      },
      _count: {
        id: true,
      },
    });

    const predictionTypeCounts = {
      DIABETES: 0,
      CARDIOVASCULAR: 0,
      HYPERTENSION: 0,
      READMISSION: 0,
    };

    predictionTypeRaw.forEach((item) => {
      const type = item.predictionType as keyof typeof predictionTypeCounts;
      if (type in predictionTypeCounts) {
        predictionTypeCounts[type] = item._count.id;
      }
    });

    // 4. Recent predictions (latest 5 with patient details)
    const recentPredictions = await prisma.prediction.findMany({
      where: {
        patient: patientWhereClause,
        deletedAt: null,
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, mrn: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 5. Risk Trends Over Time (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const trendPredictions = await prisma.prediction.findMany({
      where: {
        patient: patientWhereClause,
        createdAt: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
      select: {
        createdAt: true,
        riskCategory: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Map trends in JS grouped by date (YYYY-MM-DD)
    const trendMap: Record<string, { LOW: number; MODERATE: number; HIGH: number; CRITICAL: number }> = {};
    
    // Initialize last 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      trendMap[dateStr] = { LOW: 0, MODERATE: 0, HIGH: 0, CRITICAL: 0 };
    }

    trendPredictions.forEach((p) => {
      const dateStr = p.createdAt.toISOString().split('T')[0];
      if (trendMap[dateStr]) {
        const cat = p.riskCategory as 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
        trendMap[dateStr][cat]++;
      }
    });

    const riskTrendsOverTime = Object.entries(trendMap).map(([date, counts]) => ({
      date,
      ...counts,
    }));

    logger.info(`Analytics overview compiled for Hospital: ${user.hospitalId || 'GLOBAL'}`);

    return res.status(200).json({
      status: 'success',
      data: {
        patientCount,
        riskDistribution,
        predictionTypeCounts,
        recentPredictions,
        riskTrendsOverTime,
      },
    });
  } catch (error) {
    next(error);
  }
}
