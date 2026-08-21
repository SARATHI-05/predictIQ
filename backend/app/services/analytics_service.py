from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.models.food_record import FoodRecord
from app.models.prediction import Prediction
from typing import Dict, Any, List
from datetime import date, timedelta

def get_food_category_performance(db: Session) -> List[Dict[str, Any]]:
    """
    Feature 10: Food Category Performance Analytics.
    Calculates for every category from real database records:
    - Average Prepared
    - Average Consumed
    - Average Leftover
    - Average Demand
    - Wastage Percentage
    - Number of Records
    """
    categories = db.query(
        FoodRecord.food_category,
        func.count(FoodRecord.id).label('records_count'),
        func.avg(FoodRecord.food_prepared).label('avg_prepared'),
        func.avg(FoodRecord.food_consumed).label('avg_consumed'),
        func.avg(FoodRecord.leftover).label('avg_leftover'),
        func.sum(FoodRecord.food_prepared).label('sum_prepared'),
        func.sum(FoodRecord.leftover).label('sum_leftover')
    ).group_by(FoodRecord.food_category).all()

    performance = []
    for c in categories:
        avg_prep = round(float(c.avg_prepared or 0), 1)
        avg_cons = round(float(c.avg_consumed or 0), 1)
        avg_left = round(float(c.avg_leftover or 0), 1)
        sum_p = float(c.sum_prepared or 1)
        sum_l = float(c.sum_leftover or 0)
        wastage_pct = round((sum_l / max(1, sum_p)) * 100, 2)

        performance.append({
            'food_category': c.food_category,
            'number_of_records': c.records_count,
            'average_prepared': avg_prep,
            'average_consumed': avg_cons,
            'average_leftover': avg_left,
            'average_demand': avg_cons,
            'wastage_percentage': wastage_pct,
            'efficiency_rate': round(100.0 - wastage_pct, 2)
        })

    return sorted(performance, key=lambda x: -x['average_consumed'])

def get_smart_wastage_insights(db: Session) -> List[Dict[str, Any]]:
    """
    Feature 11: Smart Wastage Insights Engine.
    Dynamically computes intelligent recommendations based on real historical database records:
    - Identifies food category with highest average leftover
    - Analyzes weekend vs weekday wastage delta
    - Flags low-demand categories where preparation should be scaled back
    - Identifies event day demand surges
    """
    records = db.query(FoodRecord).all()
    if not records:
        return []

    insights = []

    # 1. Category with Highest Average Leftover
    cat_perf = get_food_category_performance(db)
    if cat_perf:
        highest_waste_cat = max(cat_perf, key=lambda x: x['average_leftover'])
        insights.append({
            'type': 'CATEGORY_ALERT',
            'severity': 'Warning',
            'title': f'{highest_waste_cat["food_category"]} Waste Optimization',
            'recommendation': f'{highest_waste_cat["food_category"]} has the highest average leftover quantity ({highest_waste_cat["average_leftover"]} meals/service, {highest_waste_cat["wastage_percentage"]}% waste rate). Consider reducing safety buffer from 8% to 4%.'
        })

    # 2. Weekend vs Weekday Wastage Comparison
    weekend_leftovers = []
    weekday_leftovers = []
    for r in records:
        day_idx = r.date.weekday() # 5=Sat, 6=Sun
        if day_idx >= 5:
            weekend_leftovers.append(r.leftover)
        else:
            weekday_leftovers.append(r.leftover)

    if weekend_leftovers and weekday_leftovers:
        avg_weekend_waste = sum(weekend_leftovers) / len(weekend_leftovers)
        avg_weekday_waste = sum(weekday_leftovers) / len(weekday_leftovers)
        if avg_weekend_waste > avg_weekday_waste:
            delta_pct = round(((avg_weekend_waste - avg_weekday_waste) / max(1, avg_weekday_waste)) * 100, 1)
            insights.append({
                'type': 'WEEKEND_TREND',
                'severity': 'Info',
                'title': 'Weekend Consumption Variance',
                'recommendation': f'Food wastage is {delta_pct}% higher on weekends ({round(avg_weekend_waste, 1)} meals avg) compared to weekdays ({round(avg_weekday_waste, 1)} meals avg). Adjust weekend batch sizes dynamically.'
            })

    # 3. Low-demand category overpreparation check
    if cat_perf:
        lowest_demand_cat = min(cat_perf, key=lambda x: x['average_demand'])
        if lowest_demand_cat['wastage_percentage'] > 5.0:
            insights.append({
                'type': 'PREPARATION_TUNING',
                'severity': 'Action',
                'title': f'Scale Down {lowest_demand_cat["food_category"]} Batching',
                'recommendation': f'{lowest_demand_cat["food_category"]} has lower customer demand ({lowest_demand_cat["average_demand"]} meals avg) but incurs {lowest_demand_cat["wastage_percentage"]}% leftover. Recommended preparation reduction: 15-20 meals.'
            })

    # 4. Special Event Demand Surge
    event_records = [r for r in records if r.special_event == 'Yes']
    non_event_records = [r for r in records if r.special_event == 'No']
    if event_records and non_event_records:
        avg_event_demand = sum(r.food_consumed for r in event_records) / len(event_records)
        avg_normal_demand = sum(r.food_consumed for r in non_event_records) / len(non_event_records)
        surge_pct = round(((avg_event_demand - avg_normal_demand) / max(1, avg_normal_demand)) * 100, 1)
        insights.append({
            'type': 'EVENT_SPIKE',
            'severity': 'Info',
            'title': 'Special Event Surge Protocol',
            'recommendation': f'Demand is consistently {surge_pct}% higher on special event days ({round(avg_event_demand, 1)} vs {round(avg_normal_demand, 1)} meals). ML model automatically scales raw material orders during event schedules.'
        })

    return insights

def get_analytics_insights(db: Session) -> Dict[str, Any]:
    """Compute deep AI & statistical insights on historical demand, wastage, and peak patterns"""
    total_records = db.query(FoodRecord).count()
    if total_records == 0:
        return {
            'total_records': 0,
            'highest_demand_food': 'N/A',
            'lowest_demand_food': 'N/A',
            'average_daily_demand': 0,
            'average_wastage': 0,
            'most_wasted_category': 'N/A',
            'peak_demand_day': 'N/A',
            'weather_demand_impact': [],
            'category_efficiency': [],
            'category_performance': [],
            'smart_insights': []
        }

    # 1. Highest & Lowest Demand Food Categories
    cat_demand = db.query(
        FoodRecord.food_category,
        func.avg(FoodRecord.food_consumed).label('avg_consumed'),
        func.sum(FoodRecord.food_consumed).label('total_consumed'),
        func.avg(FoodRecord.food_prepared).label('avg_prep'),
        func.sum(FoodRecord.leftover).label('total_waste')
    ).group_by(FoodRecord.food_category).all()

    sorted_by_demand = sorted(cat_demand, key=lambda x: x.avg_consumed or 0, reverse=True)
    highest_demand = sorted_by_demand[0].food_category if sorted_by_demand else 'N/A'
    lowest_demand = sorted_by_demand[-1].food_category if sorted_by_demand else 'N/A'

    # 2. Most Wasted Category
    sorted_by_waste = sorted(cat_demand, key=lambda x: x.total_waste or 0, reverse=True)
    most_wasted = sorted_by_waste[0].food_category if sorted_by_waste else 'N/A'

    # 3. Overall Averages
    overall = db.query(
        func.avg(FoodRecord.food_consumed).label('avg_consumed'),
        func.avg(FoodRecord.leftover).label('avg_waste'),
        func.avg(FoodRecord.expected_customers).label('avg_customers')
    ).first()

    avg_demand = round(float(overall.avg_consumed or 0), 1)
    avg_waste = round(float(overall.avg_waste or 0), 1)

    # 4. Weather Impact
    weather_stats = db.query(
        FoodRecord.weather,
        func.avg(FoodRecord.food_consumed).label('avg_demand'),
        func.avg(FoodRecord.leftover).label('avg_waste')
    ).group_by(FoodRecord.weather).all()

    weather_impact = [{
        'weather': w.weather,
        'avg_demand': round(float(w.avg_demand or 0), 1),
        'avg_waste': round(float(w.avg_waste or 0), 1)
    } for w in weather_stats]

    # 5. Category Efficiency & Wastage Percent
    category_efficiency = []
    for c in cat_demand:
        prep = float(c.avg_prep or 1)
        cons = float(c.avg_consumed or 0)
        waste = float(c.total_waste or 0)
        eff = round((cons / max(1, prep)) * 100, 1)
        category_efficiency.append({
            'category': c.food_category,
            'avg_demand': round(cons, 1),
            'avg_prepared': round(prep, 1),
            'efficiency_score': min(100.0, eff),
            'total_leftover': int(waste)
        })

    # 6. Peak Demand Day
    records = db.query(FoodRecord.date, FoodRecord.food_consumed).all()
    day_counts = {}
    for r in records:
        day_name = r.date.strftime('%A')
        if day_name not in day_counts:
            day_counts[day_name] = {'total': 0, 'count': 0}
        day_counts[day_name]['total'] += r.food_consumed
        day_counts[day_name]['count'] += 1

    peak_day = 'Friday'
    max_day_avg = 0
    day_averages = []
    for d, v in day_counts.items():
        d_avg = v['total'] / max(1, v['count'])
        day_averages.append({'day': d, 'avg_demand': round(d_avg, 1)})
        if d_avg > max_day_avg:
            max_day_avg = d_avg
            peak_day = d

    # Additional features
    cat_performance = get_food_category_performance(db)
    smart_insights = get_smart_wastage_insights(db)

    return {
        'total_records': total_records,
        'highest_demand_food': highest_demand,
        'lowest_demand_food': lowest_demand,
        'average_daily_demand': avg_demand,
        'average_wastage': avg_waste,
        'most_wasted_category': most_wasted,
        'peak_demand_day': peak_day,
        'weather_demand_impact': weather_impact,
        'day_averages': day_averages,
        'category_efficiency': category_efficiency,
        'category_performance': cat_performance,
        'smart_insights': smart_insights
    }

def get_wastage_summary(db: Session) -> Dict[str, Any]:
    """Compute detailed food wastage analytics, percentages, historical trends, and smart insights"""
    records = db.query(FoodRecord).order_by(FoodRecord.date.asc()).all()
    if not records:
        return {
            'total_prepared': 0,
            'total_consumed': 0,
            'total_wastage': 0,
            'overall_wastage_percentage': 0.0,
            'daily_wastage_trend': [],
            'category_wastage': [],
            'smart_insights': []
        }

    total_prep = sum(r.food_prepared for r in records)
    total_cons = sum(r.food_consumed for r in records)
    total_waste = sum(r.leftover for r in records)
    overall_pct = round((total_waste / max(1, total_prep)) * 100, 2)

    # Group daily trend (last 30 records/dates)
    daily_map = {}
    for r in records:
        d_str = r.date.strftime('%Y-%m-%d')
        if d_str not in daily_map:
            daily_map[d_str] = {'date': d_str, 'prepared': 0, 'consumed': 0, 'leftover': 0}
        daily_map[d_str]['prepared'] += r.food_prepared
        daily_map[d_str]['consumed'] += r.food_consumed
        daily_map[d_str]['leftover'] += r.leftover

    daily_trend = list(daily_map.values())[-30:]
    for d in daily_trend:
        d['wastage_percent'] = round((d['leftover'] / max(1, d['prepared'])) * 100, 1)

    # Group by category
    cat_map = {}
    for r in records:
        c = r.food_category
        if c not in cat_map:
            cat_map[c] = {'category': c, 'prepared': 0, 'consumed': 0, 'leftover': 0}
        cat_map[c]['prepared'] += r.food_prepared
        cat_map[c]['consumed'] += r.food_consumed
        cat_map[c]['leftover'] += r.leftover

    category_wastage = []
    for c, v in cat_map.items():
        v['wastage_percent'] = round((v['leftover'] / max(1, v['prepared'])) * 100, 1)
        category_wastage.append(v)

    smart_insights = get_smart_wastage_insights(db)

    return {
        'total_prepared': total_prep,
        'total_consumed': total_cons,
        'total_wastage': total_waste,
        'overall_wastage_percentage': overall_pct,
        'daily_wastage_trend': daily_trend,
        'category_wastage': category_wastage,
        'smart_insights': smart_insights
    }
