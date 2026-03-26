import WidgetKit
import SwiftUI

// MARK: - Shared data model

struct WidgetEntry: TimelineEntry {
    let date: Date
    // Fitness
    let steps: Int
    let caloriesBurned: Int
    let activeMinutes: Int
    // Nutrition
    let caloriesConsumed: Int
    let caloriesGoal: Int
    let waterMl: Int
    let waterGoalMl: Int
    // Finance
    let netSpend: Double
    // Habits
    let habitsCompleted: Int
    let habitsTotal: Int
    // Mood
    let moodEmoji: String?
    // Partner
    let partnerImageUrl: String?
    let partnerCaption: String?
    let partnerSenderName: String?
}

func readSharedData() -> WidgetEntry {
    let group = "group.com.yourname.everydayapp" // replace with your bundle ID
    let defaults = UserDefaults(suiteName: group)
    let json = defaults?.string(forKey: "widgetData") ?? "[]"
    guard let data = json.data(using: .utf8),
          let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
        return emptyEntry()
    }

    func payload(_ type: String) -> [String: Any] {
        (arr.first(where: { $0["type"] as? String == type })?["data"] as? [String: Any]) ?? [:]
    }

    let fit = payload("fitness")
    let nut = payload("nutrition")
    let fin = payload("finance")
    let hab = payload("habits")
    let mood = payload("mood")
    let par = payload("partner")

    return WidgetEntry(
        date: Date(),
        steps: fit["steps"] as? Int ?? 0,
        caloriesBurned: fit["caloriesBurned"] as? Int ?? 0,
        activeMinutes: fit["activeMinutes"] as? Int ?? 0,
        caloriesConsumed: nut["caloriesConsumed"] as? Int ?? 0,
        caloriesGoal: nut["caloriesGoal"] as? Int ?? 2000,
        waterMl: nut["waterMl"] as? Int ?? 0,
        waterGoalMl: nut["waterGoalMl"] as? Int ?? 2000,
        netSpend: fin["netSpend"] as? Double ?? 0,
        habitsCompleted: hab["completedCount"] as? Int ?? 0,
        habitsTotal: hab["activeCount"] as? Int ?? 0,
        moodEmoji: mood["emoji"] as? String,
        partnerImageUrl: par["imageUrl"] as? String,
        partnerCaption: par["caption"] as? String,
        partnerSenderName: par["senderName"] as? String
    )
}

func emptyEntry() -> WidgetEntry {
    WidgetEntry(date: Date(), steps: 0, caloriesBurned: 0, activeMinutes: 0,
                caloriesConsumed: 0, caloriesGoal: 2000, waterMl: 0, waterGoalMl: 2000,
                netSpend: 0, habitsCompleted: 0, habitsTotal: 0, moodEmoji: nil,
                partnerImageUrl: nil, partnerCaption: nil, partnerSenderName: nil)
}

// MARK: - Generic provider (all widgets share same data)

struct EDAProvider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry { readSharedData() }
    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> Void) { completion(readSharedData()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        let refresh = Calendar.current.date(byAdding: .minute, value: 30, to: Date())!
        completion(Timeline(entries: [readSharedData()], policy: .after(refresh)))
    }
}

struct PartnerProvider: TimelineProvider {
    func placeholder(in context: Context) -> WidgetEntry { readSharedData() }
    func getSnapshot(in context: Context, completion: @escaping (WidgetEntry) -> Void) { completion(readSharedData()) }
    func getTimeline(in context: Context, completion: @escaping (Timeline<WidgetEntry>) -> Void) {
        let refresh = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        completion(Timeline(entries: [readSharedData()], policy: .after(refresh)))
    }
}

// MARK: - Views

struct FitnessView: View {
    let e: WidgetEntry
    var body: some View {
        VStack(spacing: 2) {
            Text("Fitness").font(.caption2).fontWeight(.semibold).foregroundColor(.indigo)
            Text("\(e.steps.formatted())").font(.system(size: 28, weight: .bold))
            Text("steps").font(.caption2).foregroundColor(.secondary)
            Text("\(e.caloriesBurned) cal burned").font(.caption2).foregroundColor(.secondary)
        }
        .padding()
        .containerBackground(.regularMaterial, for: .widget)
    }
}

struct NutritionView: View {
    let e: WidgetEntry
    var body: some View {
        VStack(spacing: 2) {
            Text("Nutrition").font(.caption2).fontWeight(.semibold).foregroundColor(.green)
            Text("\(e.caloriesConsumed) / \(e.caloriesGoal)").font(.system(size: 18, weight: .bold))
            Text("kcal").font(.caption2).foregroundColor(.secondary)
            Text("💧 \(e.waterMl)ml / \(e.waterGoalMl)ml").font(.caption2).foregroundColor(.blue)
        }
        .padding()
        .containerBackground(.regularMaterial, for: .widget)
    }
}

struct FinanceView: View {
    let e: WidgetEntry
    var body: some View {
        VStack(spacing: 2) {
            Text("Finance").font(.caption2).fontWeight(.semibold).foregroundColor(.orange)
            Text(String(format: "$%.2f", e.netSpend)).font(.system(size: 24, weight: .bold))
            Text("spent today").font(.caption2).foregroundColor(.secondary)
        }
        .padding()
        .containerBackground(.regularMaterial, for: .widget)
    }
}

struct HabitsView: View {
    let e: WidgetEntry
    var body: some View {
        VStack(spacing: 2) {
            Text("Habits").font(.caption2).fontWeight(.semibold).foregroundColor(.purple)
            Text("\(e.habitsCompleted)/\(e.habitsTotal)").font(.system(size: 28, weight: .bold))
            Text("done today").font(.caption2).foregroundColor(.secondary)
        }
        .padding()
        .containerBackground(.regularMaterial, for: .widget)
    }
}

struct MoodView: View {
    let e: WidgetEntry
    let map = ["1": "😞", "2": "😕", "3": "😐", "4": "🙂", "5": "😄"]
    var body: some View {
        VStack(spacing: 2) {
            Text("Mood").font(.caption2).fontWeight(.semibold).foregroundColor(.orange)
            if let m = e.moodEmoji, let emoji = map[m] {
                Text(emoji).font(.system(size: 36))
            } else {
                Text("Tap to log").font(.caption).foregroundColor(.secondary)
            }
        }
        .padding()
        .containerBackground(.regularMaterial, for: .widget)
    }
}

struct PartnerView: View {
    let e: WidgetEntry
    var body: some View {
        Group {
            if let urlStr = e.partnerImageUrl, let url = URL(string: urlStr) {
                ZStack(alignment: .bottomLeading) {
                    AsyncImage(url: url) { img in img.resizable().scaledToFill() } placeholder: { Color.gray.opacity(0.2) }
                    LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .center, endPoint: .bottom)
                    VStack(alignment: .leading, spacing: 1) {
                        if let name = e.partnerSenderName { Text(name).font(.caption2).fontWeight(.semibold).foregroundColor(.white) }
                        if let cap = e.partnerCaption { Text(cap).font(.caption2).foregroundColor(.white.opacity(0.8)).lineLimit(2) }
                    }.padding(8)
                }.clipped()
            } else {
                VStack { Text("💕").font(.system(size: 32)); Text("No photos yet").font(.caption).foregroundColor(.secondary) }
            }
        }
        .containerBackground(.regularMaterial, for: .widget)
    }
}

// MARK: - Widget declarations

struct FitnessWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FitnessWidget", provider: EDAProvider()) { FitnessView(e: $0) }
            .configurationDisplayName("Fitness").description("Steps and calories burned.").supportedFamilies([.systemSmall])
    }
}
struct NutritionWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "NutritionWidget", provider: EDAProvider()) { NutritionView(e: $0) }
            .configurationDisplayName("Nutrition").description("Calories and water.").supportedFamilies([.systemSmall])
    }
}
struct FinanceWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FinanceWidget", provider: EDAProvider()) { FinanceView(e: $0) }
            .configurationDisplayName("Finance").description("Today's spending.").supportedFamilies([.systemSmall])
    }
}
struct HabitsWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "HabitsWidget", provider: EDAProvider()) { HabitsView(e: $0) }
            .configurationDisplayName("Habits").description("Daily habit progress.").supportedFamilies([.systemSmall])
    }
}
struct MoodWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "MoodWidget", provider: EDAProvider()) { MoodView(e: $0) }
            .configurationDisplayName("Mood").description("Today's mood.").supportedFamilies([.systemSmall])
    }
}
struct PartnerWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "PartnerWidget", provider: PartnerProvider()) { PartnerView(e: $0) }
            .configurationDisplayName("Partner").description("Latest photo from a friend.").supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct EveryDayWidgetBundle: WidgetBundle {
    var body: some Widget {
        FitnessWidget(); NutritionWidget(); FinanceWidget(); HabitsWidget(); MoodWidget(); PartnerWidget()
    }
}
