import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { PortLinks } from "./project-links"

describe("PortLinks", () => {
  it("links numeric ports to the host", () => {
    render(<PortLinks ports={["3000"]} host="pi-box" />)

    expect(screen.getByText("3000").closest("a")).toHaveAttribute(
      "href",
      "http://pi-box:3000",
    )
  })

  it("renders crafted ports as inert text, never as links", () => {
    render(
      <PortLinks
        ports={["3000@example.com:evil", "3000/path", "abc", "99999", "0"]}
        host="pi-box"
      />,
    )

    for (const port of ["3000@example.com:evil", "3000/path", "abc", "99999", "0"]) {
      const node = screen.getByText(port, { exact: true })
      expect(node.closest("a")).toBeNull()
    }
    expect(document.querySelector("a")).toBeNull()
  })

  it("renders numeric ports as inert text when the host is not a plain hostname", () => {
    render(<PortLinks ports={["3000"]} host="evil.com/@example.com" />)

    expect(screen.getByText("3000").closest("a")).toBeNull()
  })
})
