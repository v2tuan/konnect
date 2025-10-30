import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { FilterUsersDto } from './dto/filter-users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}

  @Get()
  async findAll() {
    return this.userService.findAll();
  }

  @Get('statistics')
  async getUserStatistics(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.userService.getUserStatistics(from, to);
  }

  @Get('total')
  async getTotalUsers() {
    return this.userService.getTotalUsers();
  }

  @Get('new-count')
  async getNewUsersCount(@Query('since') since: string) {
    return this.userService.getNewUsersCount(since);
  }

  @Get('new-stats')
  async getNewUserStatistics(@Query('since') since: string) {
    return this.userService.getNewUsersStats(since);
  }

  @Get('filter')
  async findWithFilter(@Query() query: FilterUsersDto) {
    return this.userService.findWWithFilter(query);
  }

  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  @Post(':id/restore')
  async restoreUser(@Param('id') id: string) {
    return this.userService.restoreUser(id);
  }
}
