import { describe, expect, it } from "vitest";

import { parseHebauExamResponse } from "@/lib/schools/hebau/exams";
import { parseHebauJwcNewsList } from "@/lib/schools/hebau/jwc-news";

describe("parseHebauExamResponse", () => {
  it("合并 arranged 与 notArranged 并标准化字段", () => {
    const payload = {
      datas: {
        queryMyExamArrangeMent: {
          arranged: [
            {
              KCMC: "动物遗传学",
              KSRQ: "2026-06-30",
              KSSJ: "09:00-11:00",
              CDMC: "西校区教室A101",
              ZWH: "18",
            },
          ],
          notArranged: [
            {
              KCM: "羊生产学",
              KSRQ: "2026-07-07",
              KSDM_DISPLAY: "2025-2026-2学期期末考试",
            },
          ],
        },
      },
    };

    expect(parseHebauExamResponse(payload)).toEqual([
      {
        subject: "动物遗传学",
        date: "2026-06-30",
        time: "09:00-11:00",
        location: "西校区教室A101",
        seatNumber: "18",
      },
      {
        subject: "羊生产学",
        date: "2026-07-07",
        time: "",
        location: "",
        seatNumber: "",
        notes: "2025-2026-2学期期末考试",
      },
    ]);
  });

  it("按关键信息去重", () => {
    const payload = {
      datas: {
        queryMyExamArrangeMent: {
          arranged: [
            { KCMC: "植物生理学", KSRQ: "2026-07-01", KSSJ: "14:00-16:00", CDMC: "B201" },
            { KCMC: "植物生理学", KSRQ: "2026-07-01", KSSJ: "14:00-16:00", CDMC: "B201" },
          ],
        },
      },
    };

    expect(parseHebauExamResponse(payload)).toHaveLength(1);
  });
});

describe("parseHebauJwcNewsList", () => {
  it("解析通知列表并生成完整链接与日期", () => {
    const html = `
      <div class="inn_com mtsj listh">
        <ul>
          <li data-aos="fade-up">
            <a href="../info/1010/1976.htm" class="flex">
              <div class="mtdate flex">
                <span>12</span>
                <p>2026.05</p>
              </div>
              <div class="mt-r flex">
                <h2 class="l1">关于开展 2026 年本科教学项目申报的通知</h2>
                <p class="l2">摘要</p>
              </div>
            </a>
          </li>
        </ul>
      </div>
    `;

    expect(
      parseHebauJwcNewsList(
        html,
        "https://jiaowu.hebau.edu.cn/index/tzgg.htm",
        "通知公告"
      )
    ).toEqual([
      {
        title: "关于开展 2026 年本科教学项目申报的通知",
        url: "https://jiaowu.hebau.edu.cn/info/1010/1976.htm",
        date: "2026-05-12",
        category: "通知公告",
      },
    ]);
  });
});
