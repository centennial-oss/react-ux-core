# react-ux-core - Privacy Policy

**Last updated:** October 17, 2026

## Summary

react-ux-core does not collect, transmit, or share any personal data.

## Data Collection

**We collect nothing.** react-ux-core is a library of React components that runs entirely inside the application that
uses it. It does not:

- Collect personal information
- Use analytics or tracking
- Make network requests of its own
- Communicate with any Centennial OSS servers

Some components load content from addresses that the **application** gives them, never from Centennial OSS:

- The map entry point (`@centennial-oss/react-ux-core/map`) loads its style and tiles from a URL the application
  configures, so those requests go to whichever map provider the application chooses.
- The media, DICOM, 3D, PDF and chat components load the images, documents, audio, video, models and files the
  application passes in, from wherever the application hosts them.
- The maths input (`MathInput`) loads its fonts from a folder the application serves.

Applications built with react-ux-core have their own privacy policies, which govern any data those applications
collect.

## Changes

We may update this policy occasionally, but will never snoop on you or collect analytics. The "Last updated" date at the top reflects the latest version.

## Contact

Questions? Open an issue at [github.com/centennial-oss/react-ux-core/issues](https://github.com/centennial-oss/react-ux-core/issues).
