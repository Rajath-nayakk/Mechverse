#include "WorkshopTools/ToolBase.h"

AToolBase::AToolBase()
	: ToolName(FText::FromString(TEXT("Standard 1/2\" Torque Wrench")))
	, Category(EToolCategory::TorqueWrench)
	, ToolDriveSize(EDriveSize::Drive1_2Inch)
	, bHasSocketInstalled(true)
	, InstalledSocket(17.0f, EDriveSize::Drive1_2Inch, EFastenerDriveType::HexMetric)
	, InstalledSocketSizeMm(17.0f)
	, ConfiguredTorqueSettingNm(25.0f)
{
	PrimaryActorTick.bCanEverTick = false;
}

bool AToolBase::InstallSocket(const FSocketSpecification& NewSocket, FText& OutMessage)
{
	if (NewSocket.DriveSize != ToolDriveSize)
	{
		OutMessage = FText::FromString(TEXT("Drive size mismatch! Cannot mount socket to tool anvil."));
		return false;
	}

	InstalledSocket = NewSocket;
	bHasSocketInstalled = true;
	InstalledSocketSizeMm = NewSocket.SocketSizeMm;
	OutMessage = FText::FromString(FString::Printf(TEXT("Installed %.1fmm socket on tool."), InstalledSocketSizeMm));
	return true;
}

void AToolBase::RemoveSocket()
{
	bHasSocketInstalled = false;
	InstalledSocketSizeMm = 0.0f;
}

bool AToolBase::CanOperateOnFastener(const FFastenerSpecification& FastenerSpec, FText& OutFailureReason) const
{
	if (Category != EToolCategory::HandWrench && 
		Category != EToolCategory::RatchetSocket && 
		Category != EToolCategory::TorqueWrench && 
		Category != EToolCategory::ImpactGun)
	{
		OutFailureReason = FText::FromString(TEXT("Selected tool is not a fastener tightening/loosening tool."));
		return false;
	}

	// For socket tools, socket must be mounted
	if (Category != EToolCategory::HandWrench && !bHasSocketInstalled)
	{
		OutFailureReason = FText::FromString(TEXT("No socket installed on tool anvil! Select and attach a socket first."));
		return false;
	}

	const float EffectiveSocketSizeMm = bHasSocketInstalled ? InstalledSocket.SocketSizeMm : InstalledSocketSizeMm;

	if (FMath::Abs(EffectiveSocketSizeMm - FastenerSpec.SocketSizeMm) > 0.1f)
	{
		OutFailureReason = FText::FromString(FString::Printf(
			TEXT("Incorrect socket: this fastener requires a compatible %.1f mm hex socket (installed: %.1f mm)."), 
			FastenerSpec.SocketSizeMm, 
			EffectiveSocketSizeMm));
		return false;
	}

	if (bHasSocketInstalled && InstalledSocket.Profile != FastenerSpec.DriveType)
	{
		OutFailureReason = FText::FromString(TEXT("Fastener drive head profile mismatch! (e.g. Hex vs Torx)."));
		return false;
	}

	OutFailureReason = FText::FromString(TEXT("Tool is compatible."));
	return true;
}
