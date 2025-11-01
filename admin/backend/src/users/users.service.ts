import { Injectable } from '@nestjs/common';
import { User } from './user.schema';
import { Model, FilterQuery } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { FilterUsersDto } from './dto/filter-users.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async findAll(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  async getUserStatistics(
    from?: string,
    to?: string,
  ): Promise<{ date: string; user: number }[]> {
    const fromDate = from ? new Date(from) : new Date('1970-01-01');
    const toDate = to ? new Date(to) : new Date();

    type AggStat = { _id: string; count: number };

    const stats = await this.userModel.aggregate<AggStat>([
      {
        $match: {
          createdAt: { $gte: fromDate, $lte: toDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return stats.map((stat) => ({
      date: stat._id,
      user: stat.count,
    }));
  }

  async getTotalUsers(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }

  async getNewUsersCount(since: string): Promise<number> {
    const sinceDate = new Date(since);
    return this.userModel
      .countDocuments({ createdAt: { $gte: sinceDate } })
      .exec();
  }

  async getNewUsersStats(since: string): Promise<{
    currentCount: number;
    previousCount: number;
    percentageChange: number;
    trend: 'increase' | 'decrease' | 'no change';
  }> {
    const sinceDate = new Date(since);
    const now = new Date();

    // Xác định độ dài giai đoạn hiện tại (vd: từ sinceDate đến now)
    const periodLength = now.getTime() - sinceDate.getTime();

    // Giai đoạn liền trước (previous period)
    const previousStart = new Date(sinceDate.getTime() - periodLength);
    const previousEnd = sinceDate;

    // Đếm số user mới trong hai giai đoạn
    const [currentCount, previousCount] = await Promise.all([
      this.userModel.countDocuments({
        createdAt: { $gte: sinceDate, $lte: now },
      }),
      this.userModel.countDocuments({
        createdAt: { $gte: previousStart, $lt: previousEnd },
      }),
    ]);

    // Tính phần trăm thay đổi
    let percentageChange = 0;
    let trend: 'increase' | 'decrease' | 'no change' = 'no change';

    if (previousCount === 0 && currentCount > 0) {
      percentageChange = 100;
      trend = 'increase';
    } else if (previousCount === 0 && currentCount === 0) {
      percentageChange = 0;
    } else {
      percentageChange = ((currentCount - previousCount) / previousCount) * 100;
      trend =
        currentCount > previousCount
          ? 'increase'
          : currentCount < previousCount
            ? 'decrease'
            : 'no change';
    }

    return {
      currentCount,
      previousCount,
      percentageChange: Number(percentageChange.toFixed(2)),
      trend,
    };
  }

  async findWWithFilter(query: FilterUsersDto): Promise<{
    total: number;
    page: number;
    totalPages: number;
    users: User[];
  }> {
    const {
      search,
      startDate,
      endDate,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sort = 'desc',
    } = query;

    const filter: FilterQuery<User> = {};

    if (search) {
      filter.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      const createdAtFilter: { $gte?: Date; $lte?: Date } = {};
      if (startDate) {
        createdAtFilter.$gte = new Date(startDate);
      }
      if (endDate) {
        createdAtFilter.$lte = new Date(endDate);
      }
      filter.createdAt = createdAtFilter;
    }

    const skip = (page - 1) * limit;
    const sortOrder = sort === 'asc' ? 1 : -1;

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.userModel.countDocuments(filter).exec(),
    ]);

    return {
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      users,
    };
  }

  async deleteUser(id: string): Promise<User | null> {
    await this.userModel
      .findByIdAndUpdate(id, { _destroy: true }, { new: true })
      .exec();
    return this.userModel.findById(id).exec();
  }

  async restoreUser(id: string): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(id, { _destroy: false }, { new: true })
      .exec();
  }

  async getUserById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }
}
