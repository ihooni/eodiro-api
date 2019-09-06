import University from 'Database/models/university'
import ClassSeeder from 'DB/ClassSeeder'
import EmptyCount from 'Database/models/empty-count'
import MealSeeder from 'DB/MealSeeder'

export default class DBInitializer {
  private classSeeder: ClassSeeder

  private mealSeeder: MealSeeder

  public constructor() {
    this.classSeeder = new ClassSeeder()
    this.mealSeeder = new MealSeeder()
  }

  /**
   * Initialize database.
   */
  public async initialize(): Promise<void> {
    const promises = []
    promises.push(this.classSeeder.run())
    promises.push(this.mealSeeder.run())

    await Promise.all(promises)
    await this.calcEmptyCounts()
  }

  /**
   * Delete all previous empty classroom counts.
   * Calculate and save empty classroom counts in advance.
   */
  private async calcEmptyCounts(): Promise<void> {
    await EmptyCount.deletePrevCounts()
    await EmptyCount.saveCurrentCount()
    await EmptyCount.saveNextCount()
  }
}
