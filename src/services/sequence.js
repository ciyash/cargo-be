import Counter from '../models/counter.model.js';

// Seed against existing records so upgrades do not restart an existing sequence.
export async function nextSequence(key, floor = 0, count = 1) {
  const update = [{ $set: { value: { $add: [{ $max: [{ $ifNull: ['$value', floor] }, floor] }, count] } } }];
  try {
    return (await Counter.findOneAndUpdate({ _id: key }, update, { upsert: true, new: true })).value;
  } catch (error) {
    // Concurrent first use can race on the upsert; increment the winner's counter.
    if (error.code !== 11000) throw error;
    return (await Counter.findOneAndUpdate({ _id: key }, update, { new: true })).value;
  }
}
