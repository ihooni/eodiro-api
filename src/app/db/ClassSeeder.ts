import classesSeoulUnderJSON from 'Resources/classes/cau-seoul-학부.json'
import classesSeoulGradJSON from 'Resources/classes/cau-seoul-대학원.json'
import University from 'Database/models/university'
import ClassList from 'Database/models/class-list'
import Building from 'Database/models/building'
import Class from 'Database/models/class'
import { ClassDoc } from 'Database/schemas/class'
import Floor from 'Database/models/floor'
import Classroom from 'Database/models/classroom'
import Lecture from 'Database/models/lecture'
import LogHelper from 'Helpers/LogHelper'
import { ClassListDoc } from 'Database/schemas/class-list'

interface ClassesJSON {
  year: string
  semester: string
  vendor: string
  mainCourse: string
  classes: ClassDoc[]
}

// Set the current semester with this.
const currentSemester = {
  year: '2019',
  semester: '2'
}

export default class ClassSeeder {
  /**
   * Seed(resource) data for classes
   */
  private classesSeed: ClassesJSON[] = [
    classesSeoulUnderJSON as ClassesJSON,
    classesSeoulGradJSON as ClassesJSON
  ]

  /**
   * Seed the data associated with class.
   */
  public async run(): Promise<void> {
    const classCount = await Class.estimatedDocumentCount()

    // if class collection is empty, then seed data.
    if (classCount === 0) {
      await this.seedClasses()
      await this.linkClassesOfCurrentSemester()
    }
  }

  /**
   * Seed the collection of class, floor, classroom, lecture.
   */
  private async seedClasses(): Promise<void> {
    // asynchronously seed classes
    await Promise.all(
      this.classesSeed.map(async (seed: ClassesJSON) => {
        try {
          // create classes
          const classes = (await Class.insertMany(seed.classes)) as ClassDoc[]

          // create class list
          const classList = (await ClassList.create({
            year: seed.year,
            semester: seed.semester,
            mainCourse: seed.mainCourse,
            classes: classes
          })) as ClassListDoc

          // link classes to university
          await University.findOneAndUpdate(
            { vendor: seed.vendor },
            {
              $push: {
                classLists: classList._id
              }
            }
          )
        } catch (err) {
          LogHelper.log('error', 'Class save error: ' + err)
        }
      })
    )
  }

  /**
   * Create floors, classrooms and lectures using current semester's class documents.
   */
  private async linkClassesOfCurrentSemester(): Promise<void> {
    // get all current semester's classes
    const classLists = (await ClassList.find(
      { year: currentSemester.year, semester: currentSemester.semester },
      { classes: 1 }
    )
      .lean()
      .populate({
        path: 'classes',
        select: '_id closed locations times'
      })) as ClassListDoc[]

    // gather classes
    const classes: ClassDoc[] = []
    for (const classList of classLists) {
      classes.push(...(classList.classes as ClassDoc[]))
    }

    const unregisteredBldgSet = new Set()

    for (const cls of classes) {
      // skip closed class
      if (cls.closed) {
        continue
      }

      for (let i = 0; i < cls.locations.length; i++) {
        const location = cls.locations[i]

        const floorRegexp = /(?:[Bb]|)\d+(?=\d\d)/
        const floorNum = floorRegexp.exec(location.room)[0]

        // find class building
        const building = await Building.findOne({
          number: location.building
        }).lean()

        // skip unregistered building
        if (building === null) {
          unregisteredBldgSet.add(location.building)
          continue
        }

        // find class floor
        // if not exist, create floor
        const floor = await Floor.findOneAndUpdate(
          { building: building._id, number: floorNum },
          { building: building._id, number: floorNum },
          { upsert: true, new: true }
        ).lean()

        // link floor to building
        await Building.findByIdAndUpdate(building._id, {
          $addToSet: { floors: floor._id }
        })

        // find classroom
        // if not exist, create classroom
        const classroom = await Classroom.findOneAndUpdate(
          { floor: floor._id, number: location.room },
          { floor: floor._id, number: location.room },
          { upsert: true, new: true }
        ).lean()

        // link classroom to floor
        await Floor.findByIdAndUpdate(floor._id, {
          $addToSet: { classrooms: classroom._id }
        })

        // create lecture
        const lecture = await Lecture.create({
          classroom: classroom._id,
          class: cls._id,
          order: i
        })

        // link lecture to classroom
        await Classroom.findByIdAndUpdate(classroom._id, {
          $addToSet: { lectures: lecture._id }
        })
      }
    }

    // log unregistered buildings
    if (unregisteredBldgSet.size !== 0) {
      LogHelper.log(
        'warn',
        'Buildings `' +
          Array.from(unregisteredBldgSet)
            .sort()
            .join(', ') +
          '` are unregistered.'
      )
    }
  }
}
