import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DRIZZLE, type DrizzleDB } from '../database/database.module.js';
import { users } from '../database/schema.js';

@Injectable()
export class ProfileService {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async getByUserId(userId: number) {
    const user = await this.db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        patronymic: true,
        role: true,
      },
      with: {
        student: {
          columns: {
            studentNumber: true,
          },
          with: {
            group: {
              columns: {
                id: true,
                name: true,
                enrollmentYear: true,
              },
              with: {
                educationalProgram: {
                  columns: {
                    id: true,
                    name: true,
                    degreeLevel: true,
                  },
                  with: {
                    specialty: {
                      columns: {
                        code: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        supervisor: {
          columns: {
            academicDegree: true,
            academicTitle: true,
            position: true,
          },
          with: {
            orgUnit: {
              columns: {
                id: true,
                name: true,
                shortName: true,
              },
            },
          },
        },
        admin: {
          columns: {
            position: true,
          },
          with: {
            orgUnit: {
              columns: {
                id: true,
                name: true,
                shortName: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Користувача не знайдено');
    }

    return user;
  }
}
